import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MikroOrmModule } from 'nestjs-mikro-orm';
import { parentPort } from 'worker_threads';
import { DatasetCreateWorker } from './entities/dataset/DatasetWorker';
import { DatasetService } from './entities/dataset/DatasetService';
import { MapfileService } from './entities/mapfile/MapfileService';
import { MediaService } from './entities/media/MediaService';
import { StoreService } from './entities/store/StoreService';
import ormConfig from './mikro-orm.config';
import { EventServer } from './_other/workers/EventServer';
import { EventWorker } from './_other/workers/EventWorker';
import { ForkEventServer } from './_other/workers/forks/ForkEventServer';
import { ForkEventWorker } from './_other/workers/forks/ForkEventWorker';

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
    { provide: EventServer, useClass: ForkEventServer },
    { provide: EventWorker, useClass: ForkEventWorker },
  ],
})
class WorkerModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  await app.init();

  parentPort?.on('close', () => {
    app.close();
  });
}

bootstrap();
