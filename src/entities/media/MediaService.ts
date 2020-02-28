import { Injectable } from '@nestjs/common';
import { Media } from './MediaEntity';
import fs from 'fs';
import { getContext } from 'src/contexts/getContext';
import mkdirp from 'mkdirp';
import mime from 'mime';
import { error } from 'src/_other/error';
import util from 'util';

@Injectable()
export class MediaService {
  async create(i: { stream: fs.ReadStream; ctype: string }) {
    const ext = mime.getExtension(i.ctype);
    if (!ext) {
      throw error('INVALID_CTYPE', 'Content-type not recognized.');
    }
    const record = new Media();
    record.contentType = i.ctype;
    await record.save();
    // await record.reload();

    const ctx = getContext();
    await mkdirp(ctx.pathFromRoot('media'));
    return new Promise((resolve, reject) => {
      const write = fs.createWriteStream(
        ctx.pathFromRoot('media', record.uuid + '.' + ext),
      );
      i.stream.pipe(write);
      write.on('finish', resolve);
      write.on('error', reject);
    });
    return record;
  }

  async remove(i: { uuid: string }) {
    const found = await Media.findOne({ uuid: i.uuid });
    if (!found) {
      throw error('NOT_FOUND', 'Media not found.');
    }

    const ext = mime.getExtension(found.contentType);
    const ctx = getContext();
    await util.promisify(fs.unlink)(
      ctx.pathFromRoot('media', found.uuid + '.' + ext),
    );

    await found.remove();
  }
}
