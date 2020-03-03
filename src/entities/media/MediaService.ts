import { Injectable } from '@nestjs/common';
import { Media } from './MediaEntity';
import fs from 'fs';
import { getContext } from 'src/contexts/getContext';
import mkdirp from 'mkdirp';
import * as mime from 'mime';
import { error } from 'src/_other/error';
import util from 'util';
import multer from 'multer';
import path from 'path';
import { InjectRepository } from 'nestjs-mikro-orm';
import { EntityRepository } from 'mikro-orm';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media) private mediaRepo: EntityRepository<Media>,
  ) {}

  async create(i: { stream: fs.ReadStream; fileName: string }) {
    let ext = path.parse(i.fileName).ext.substr(1);
    if (!ext) {
      throw error('INVALID_CTYPE', 'Content-type not recognized.');
    }
    const record = new Media();
    record.extension = ext;
    await this.mediaRepo.persist(record);
    // await record.reload();

    const ctx = getContext();
    await mkdirp(ctx.pathFromRoot('media'));
    await new Promise((resolve, reject) => {
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
    const found = await this.mediaRepo.findOne({ uuid: i.uuid });
    if (!found) {
      throw error('NOT_FOUND', 'Media not found.');
    }

    const ext = found.extension;
    const ctx = getContext();
    await util.promisify(fs.unlink)(
      ctx.pathFromRoot('media', found.uuid + '.' + ext),
    );

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
