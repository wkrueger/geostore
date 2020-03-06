import { Controller, Post, Body, Get } from '@nestjs/common';
import { CreateMapfileDto } from './MapfileDto';
import { MapfileService } from './MapfileService';
import { EntityManager } from 'mikro-orm';

@Controller('mapfiles')
export class MapfileController {
  constructor(private mapfileSvc: MapfileService, private em: EntityManager) {}

  @Post()
  async create(@Body() body: CreateMapfileDto) {
    return this.mapfileSvc.create(body);
  }

  @Get()
  async list() {
    return this.mapfileSvc.list();
  }
}
