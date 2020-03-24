import { Body, Controller, Get, Post, Delete, Param, Query, Put } from '@nestjs/common';
import { EntityRepository } from 'mikro-orm';
import { InjectRepository } from 'nestjs-mikro-orm';
import wkx from 'wkx';
import { Store } from '../_orm/StoreEntity';
import { CreateStoreDto, StoreQueryDto as QueryStoreDto } from './StoreDto';
import { StoreService } from './StoreService';
import { ApiTags, ApiQuery, ApiBody } from '@nestjs/swagger';
import { filterWhereObject } from '../../_other/filterWhereObject';
import { error } from '../../_other/error';

@ApiTags('stores')
@Controller('stores')
export class StoreController {
  constructor(
    public storeSvc: StoreService,
    @InjectRepository(Store) private storeRepo: EntityRepository<Store>,
  ) {}

  @ApiBody({ type: CreateStoreDto })
  @Post()
  async create(@Body() body: CreateStoreDto) {
    return this.storeSvc.upsert(body);
  }

  @ApiQuery({ name: 'id', required: false })
  @Get()
  async list(@Query('id') id?: number) {
    return this.storeRepo.find(filterWhereObject({ id }));
  }

  @ApiBody({ type: CreateStoreDto })
  @Put(':id')
  async put(@Param('id') id: number, @Body() body: CreateStoreDto) {
    const found = await this.storeRepo.findOne({ id });
    if (!found) throw error('STORE_NOT_FOUND', 'Store not found.');
    return this.storeSvc.upsert(body, found);
  }

  @Post('query')
  async query(@Body() query: QueryStoreDto) {
    if (query.intersectsGeometry && typeof query.intersectsGeometry === 'object') {
      query.intersectsGeometry = wkx.Geometry.parseGeoJSON(query.intersectsGeometry).toWkb();
    }
    const resp = await this.storeSvc.query(query);
    return resp;
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    id = Number(id);
    await this.storeSvc.remove({ id });
  }
}
