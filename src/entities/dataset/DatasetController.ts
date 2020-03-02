import { Controller, Get, Post, Req, Query } from '@nestjs/common';
import { error } from 'src/_other/error';
import { MediaService } from '../media/MediaService';
import { Store } from '../store/StoreEntity';
import { Dataset } from './DatasetEntity';
import { DatasetService } from './DatasetService';
import { ApiOperation } from '@nestjs/swagger';
import { trimDocs } from 'src/_other/trimDocs';
import { createQueryBuilder } from 'typeorm';

@Controller('datasets')
export class DatasetController {
  constructor(
    private mediaService: MediaService,
    private datasetService: DatasetService,
  ) {}

  @ApiOperation({
    description: trimDocs(`
      Requires a multipart body with fields:
        - storeCode: the string code of the target store
        - file: a geoPackage. First dataset will be taken
  `),
  })
  @Post()
  async create(@Req() request: any) {
    const storeCode: string = request.body.storeCode;
    if (!storeCode) throw error('BAD_REQUEST', 'storeCode parameter missing.');
    const store = await Store.findOne({ code: storeCode });
    if (!store)
      throw error('STORE_NOT_FOUND', 'Store with this code not found.');
    if (!request.media) {
      throw error('UPLOAD_FAILED', 'Upload failed.');
    }
    const dataset = await this.datasetService.create({
      media: request.media,
      store,
    });
    return dataset;
  }

  @Get()
  async list(@Query('id') id?: number, @Query('store') store?: string) {
    const opts = {
      relations: ['operation', 'media', 'store'],
      where: {} as Partial<Dataset>,
    };
    if (store) {
      if (isNaN(parseInt(store)))
        throw error(
          'INVALID_QUERY',
          'Invalid argument format for query parameter "store".',
        );
      opts.where.store = parseInt(store) as any;
    }

    if (id) {
      return Dataset.findOne(opts);
    }
    return Dataset.find(opts);
  }
}
