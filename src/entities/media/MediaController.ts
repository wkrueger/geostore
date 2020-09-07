import { Controller, Post, Req, Body } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { error } from '../../_other/error'
import { trimDocs } from '../../_other/trimDocs'
import { LinkMediaDto } from './MediaDto'
import { MediaService } from './MediaService'

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private mediaSvc: MediaService) {}

  @ApiOperation({
    description: trimDocs(`
      Send the package as multipart on field "file".
    `),
  })
  @Post()
  async upload(@Req() request: any) {
    if (!request.media) {
      throw error('UPLOAD_FAILED', 'Upload failed.')
    }
    return request.media
  }

  @ApiOperation({
    description: trimDocs(`
      Links an already existing geopackage into the media store.
    `),
  })
  @Post('/link')
  async link(@Body() body: LinkMediaDto) {
    const media = await this.mediaSvc.link({ absPath: body.absPath })
    return media
  }
}
