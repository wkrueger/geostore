import { Body, Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { EntityRepository } from 'mikro-orm';
import { InjectRepository } from 'nestjs-mikro-orm';
import wkx from 'wkx';
import { Store } from '../_orm/StoreEntity';
import { CreateStoreDto, StoreQueryDto } from './StoreDto';
import { StoreService } from './StoreService';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('stores')
@Controller('stores')
export class StoreController {
  constructor(
    public storeSvc: StoreService,
    @InjectRepository(Store) private storeRepo: EntityRepository<Store>,
  ) {}

  @Post()
  async create(@Body() body: CreateStoreDto) {
    let store = new Store(body);
    await this.storeRepo.persistAndFlush(store);
    return store;
  }

  @Get()
  async list() {
    return this.storeRepo.findAll({ populate: ['datasets'] });
  }

  @Post('query')
  async query(@Body() query: StoreQueryDto) {
    if (query.intersectsGeometry && typeof query.intersectsGeometry === 'object') {
      query.intersectsGeometry = wkx.Geometry.parseGeoJSON(query.intersectsGeometry).toWkb();
    }
    const resp = await this.storeSvc.query(query);
    return resp;
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    id = Number(id);
    await this.storeRepo.remove({ id });
  }
}
