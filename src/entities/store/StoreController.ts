import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateStoreDTO } from './StoreDto';
import { Store } from './StoreEntity';

@Controller('stores')
export class StoreController {
  @Post()
  async create(@Body() body: CreateStoreDTO) {
    let store = new Store(body);
    return store.save();
  }

  @Get()
  async list() {
    return Store.find();
  }
}
