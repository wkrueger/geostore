import { Injectable } from '@nestjs/common';
import fs from 'fs';
import { EntityRepository } from 'mikro-orm';
import mkdirp from 'mkdirp';
import multer from 'multer';
import { InjectRepository } from 'nestjs-mikro-orm';
import path from 'path';
import { getContext } from '../../contexts/getContext';
import { error } from '../../_other/error';
import util from 'util';
import { v4 } from 'uuid';
import { Media } from '../_orm/MediaEntity';

@Injectable()
export class MediaService {
  constructor(@InjectRepository(Media) private mediaRepo: EntityRepository<Media>) {}

  async create(i: { stream: fs.ReadStream; fileName: string }) {
    let ext = path.parse(i.fileName).ext.substr(1);
    if (!ext) {
      throw error('INVALID_CTYPE', 'Content-type not recognized.');
    }
    const record = new Media();
    record.uuid = v4();
    record.extension = ext;
    await this.mediaRepo.persist(record);
    // await record.reload();

    const ctx = getContext();
    await mkdirp(ctx.pathFromRoot('media'));
    await new Promise((resolve, reject) => {
      const write = fs.createWriteStream(ctx.pathFromRoot('media', record.uuid + '.' + ext));
      i.stream.pipe(write);
      write.on('finish', resolve);
      write.on('error', reject);
    });
    return record;
  }

  async remove(i: { uuid: string }) {
    const found = await this.mediaRepo.findOne({ uuid: i.uuid });
    if (!found) {
      throw error('NOT_FOUND', 'Media not found.');
    }

    const ext = found.extension;
    const ctx = getContext();
    await util.promisify(fs.unlink)(ctx.pathFromRoot('media', found.uuid + '.' + ext));

    await this.mediaRepo.remove(found);
  }

  createMulterStorage() {
    const that = this;
    return {
      async _handleFile(req, file, cb) {
        try {
          req.media = await that.create({
            stream: file.stream,
            fileName: file.originalname,
          });
          cb(null);
        } catch (err) {
          console.log('upload error', err);
          cb(err);
        }
      },

      async _removeFile() {
        throw Error('not expected');
      },
    };
  }

  middleware = multer({ storage: this.createMulterStorage() }).single('file');

  createMulterMiddleware() {
    return (req, res, next) => {
      return this.middleware(req, res, next);
    };
  }
}
