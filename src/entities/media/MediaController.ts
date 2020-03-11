import { Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { error } from '../../_other/error';

@ApiTags('media')
@Controller('media')
export class MediaController {
  @Post()
  async upload(@Req() request: any) {
    if (!request.media) {
      throw error('UPLOAD_FAILED', 'Upload failed.');
    }
    return request.media;
  }
}
