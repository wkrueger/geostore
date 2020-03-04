import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateStoreDTO, StoreQueryDto } from './StoreDto';
import { Store } from '../_orm/StoreEntity';
import wkx from 'wkx';
import { StoreService } from './StoreService';
import { InjectRepository } from 'nestjs-mikro-orm';
import { EntityRepository } from 'mikro-orm';

@Controller('stores')
export class StoreController {
  constructor(
    public storeSvc: StoreService,
    @InjectRepository(Store) private storeRepo: EntityRepository<Store>,
  ) {}

  @Post()
  async create(@Body() body: CreateStoreDTO) {
    let store = new Store(body);
    await this.storeRepo.persistAndFlush(store);
    return store;
  }

  @Get()
  async list() {
    return this.storeRepo.findAll();
  }

  @Post('query')
  async query(@Body() query: StoreQueryDto) {
    let intersectGeom: any = undefined;
    if (query.intersect && typeof query.intersect === 'object') {
      intersectGeom = wkx.Geometry.parseGeoJSON(query.intersect).toWkt();
    }
    const resp = await this.storeSvc.query(query.dataset, intersectGeom);
    return resp;
  }
}
