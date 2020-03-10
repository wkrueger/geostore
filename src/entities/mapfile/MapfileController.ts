import { Body, Controller, Get, Param, Post, Res, Put, Delete } from '@nestjs/common';
import { EntityRepository } from 'mikro-orm';
import { InjectRepository } from 'nestjs-mikro-orm';
import { error } from '../../_other/error';
import { Mapfile } from '../_orm/MapfileEntity';
import { CreateMapfileDto } from './MapfileDto';
import { MapfileService } from './MapfileService';
import { Response } from 'express';

@Controller('mapfiles')
export class MapfileController {
  constructor(
    private mapfileSvc: MapfileService,
    @InjectRepository(Mapfile) private mapfileRepo: EntityRepository<Mapfile>,
  ) {}

  @Post()
  async create(@Body() body: CreateMapfileDto) {
    return this.mapfileSvc.create(body);
  }

  @Get()
  async list() {
    return this.mapfileSvc.list();
  }

  @Put(':id')
  async put(@Param('id') id: number, @Body() body: CreateMapfileDto) {
    id = Number(id);
    const found = await this.mapfileRepo.findOne({ id });
    if (!found) throw error('NOT_FOUND', 'Mapfile not found.');
    return this.mapfileSvc.create(body, found);
  }

  @Get(':id/render')
  async render(@Param('id') id: number, @Res() res: Response) {
    id = Number(id);
    const found = await this.mapfileRepo.findOne({ id });
    if (!found) throw error('NOT_FOUND', 'Mapfile not found');
    const txt = await this.mapfileSvc.render(found);
    res.setHeader('content-type', 'text/plain; charset=utf8');
    res.send(txt);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    id = Number(id);
    await this.mapfileRepo.remove({ id });
  }
}
