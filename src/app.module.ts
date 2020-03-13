import { Logger, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MikroORM } from 'mikro-orm';
import { MikroOrmModule } from 'nestjs-mikro-orm';
import { getContext } from './contexts/getContext';
import { DatasetController } from './entities/dataset/DatasetController';
import { DatasetService } from './entities/dataset/DatasetService';
import { MapfileController } from './entities/mapfile/MapfileController';
import { MapfileService } from './entities/mapfile/MapfileService';
import { MediaService } from './entities/media/MediaService';
import { StoreController } from './entities/store/StoreController';
import { StoreService } from './entities/store/StoreService';
import { MigrationsController } from './migrations';
import { ormConfig } from './mikro-orm.config';
import { MainExceptionFilter } from './_other/MainExceptionFilter';
import { EventServer } from './_other/workers/EventServer';
import { EventWorker } from './_other/workers/EventWorker';
import { ForkEventServer } from './_other/workers/forks/ForkEventServer';
import { ForkEventWorker } from './_other/workers/forks/ForkEventWorker';

const ctx = getContext();

@Module({
  imports: [
    MikroOrmModule.forRoot(ormConfig),
    MikroOrmModule.forFeature({ entities: ormConfig.entities }),
  ],
  controllers: [StoreController, DatasetController, MapfileController, MigrationsController],
  providers: [
    MediaService,
    DatasetService,
    StoreService,
    MapfileService,
    { provide: EventServer, useClass: ForkEventServer },
    { provide: EventWorker, useClass: ForkEventWorker },
    { provide: APP_FILTER, useClass: MainExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  constructor(private mediaService: MediaService, orm: MikroORM, public workers: EventServer<any>) {
    orm
      .getMigrator()
      .getPendingMigrations()
      .then(migrations => {
        if (migrations.length) {
          console.warn('There are', migrations.length, 'pending migrations.');
        }
      });
  }

  workerLogger = new Logger('workers');

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(this.mediaService.createMulterMiddleware())
      .forRoutes(
        { path: 'datasets', method: RequestMethod.POST },
        { path: 'media', method: RequestMethod.POST },
      );

    this.workers.start(ctx.workers.num);
  }
}
