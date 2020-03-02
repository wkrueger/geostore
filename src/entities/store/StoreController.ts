import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateStoreDTO, StoreQueryDto } from './StoreDto';
import { Store } from './StoreEntity';
import wkx from 'wkx';
import { StoreService } from './StoreService';

@Controller('stores')
export class StoreController {
  constructor(public storeSvc: StoreService) {}

  @Post()
  async create(@Body() body: CreateStoreDTO) {
    let store = new Store(body);
    return store.save();
  }

  @Get()
  async list() {
    return Store.find();
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
