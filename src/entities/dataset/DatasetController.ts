import { Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('datasets')
export class DatasetController {
  @Post()
  async create(@Req() request: Request) {
    request;
  }
}
