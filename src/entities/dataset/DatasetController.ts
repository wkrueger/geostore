import { Controller, Get, Post, Query, Req, Delete, Param, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EntityRepository } from 'mikro-orm';
import { InjectRepository } from 'nestjs-mikro-orm';
import { error } from '../../_other/error';
import { trimDocs } from '../../_other/trimDocs';
import { Dataset } from '../_orm/DatasetEntity';
import { Store } from '../_orm/StoreEntity';
import { DatasetService } from './DatasetService';
import { MediaService } from '../media/MediaService';
import { CreateFromMediaDto } from './DatasetDto';

@ApiTags('datasets')
@Controller('datasets')
export class DatasetController {
  constructor(
    private datasetService: DatasetService,
    @InjectRepository(Store) private storeRepo: EntityRepository<Store>,
    @InjectRepository(Dataset) private datasetRepo: EntityRepository<Dataset>,
    private mediaSvc: MediaService,
  ) {}

  @ApiOperation({
    description: trimDocs(`
      Requires a multipart body with fields:
        - storeCode: the string code of the target store
        - file: a geoPackage. First dataset will be taken. Must have name metadata.

      Currently requires and assumes EPSG:4326 projection.
  `),
  })
  @Post()
  async create(@Req() request: any) {
    const storeCode: string = request.body.storeCode;
    if (!storeCode) throw error('BAD_REQUEST', 'storeCode parameter missing.');
    const store = await this.storeRepo.findOne({ code: storeCode });
    if (!store) throw error('STORE_NOT_FOUND', 'Store with this code not found.');
    if (!request.media) {
      throw error('UPLOAD_FAILED', 'Upload failed.');
    }
    const notes = request.body.notes || '';
    const dataset = await this.datasetService.create({
      media: request.media,
      store,
      notes,
    });
    return dataset;
  }

  @ApiOperation({
    description: trimDocs(`
      Populates a dataset from an already uploaded media file.
    `),
  })
  @Post('/from-media')
  async createFromMedia(@Body() body: CreateFromMediaDto) {
    const media = await this.mediaSvc.getOne(body.mediaUuid);
    const store = await this.storeRepo.findOne({ code: body.storeCode });
    if (!media) throw error('BAD_REQUEST', 'Media not found.');
    if (!store) throw error('BAD_REQUEST', 'Store not found.');
    const dataset = await this.datasetService.create({ media, store, notes: body.notes || '' });
    return dataset;
  }

  @Get()
  async list(@Query('id') id?: number, @Query('store') store?: string) {
    if (store) {
      if (isNaN(parseInt(store)))
        throw error('INVALID_QUERY', 'Invalid argument format for query parameter "store".');
    }

    return this.datasetRepo.find(
      filterObj({
        id: id || undefined,
        store: store ? { code: store } : undefined,
      }),
      { populate: ['operation'] },
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    id = Number(id);
    if (!id) throw error('BAD_REQUEST', 'Missing id parameter.');
    const jobId: number = await this.datasetService.remove(id);
    return { status: 'scheduled removal', jobId };
  }
}

function filterObj<T>(obj: T): T {
  const out = {} as any;
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined) {
      out[k] = v;
    }
  });
  return out;
}
