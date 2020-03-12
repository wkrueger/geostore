import { Module } from '@nestjs/common';
import { MikroOrmModule } from 'nestjs-mikro-orm';
import { DatasetCreateWorker } from '../entities/dataset/DatasetCreateWorker';
import { DatasetService } from '../entities/dataset/DatasetService';
import { MapfileService } from '../entities/mapfile/MapfileService';
import { MediaService } from '../entities/media/MediaService';
import { StoreService } from '../entities/store/StoreService';
import ormConfig from '../mikro-orm.config';
import { ThreadsEventServer } from '../_other/workers/threads/ThreadsEventServer';

@Module({
  imports: [
    MikroOrmModule.forRoot(ormConfig),
    MikroOrmModule.forFeature({ entities: ormConfig.entities }),
  ],
  providers: [
    MediaService,
    DatasetService,
    DatasetCreateWorker,
    StoreService,
    MapfileService,
    ThreadsEventServer,
  ],
})
export class WorkerModule {}
