import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MikroOrmModule } from 'nestjs-mikro-orm';
import { DatasetController } from './entities/dataset/DatasetController';
import { DatasetService } from './entities/dataset/DatasetService';
import { MapfileController } from './entities/mapfile/MapfileController';
import { MapfileService } from './entities/mapfile/MapfileService';
import { MediaService } from './entities/media/MediaService';
import { StoreController } from './entities/store/StoreController';
import { StoreService } from './entities/store/StoreService';
import { ormConfig } from './mikro-orm.config';
import { MainExceptionFilter } from './_other/MainExceptionFilter';
import { MigrationsController } from './migrations';
import { MikroORM } from 'mikro-orm';

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
    { provide: APP_FILTER, useClass: MainExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  constructor(private mediaService: MediaService, orm: MikroORM) {
    orm
      .getMigrator()
      .getPendingMigrations()
      .then(migrations => {
        if (migrations.length) {
          console.warn('There are', migrations.length, 'pending migrations.');
        }
      });
  }

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(this.mediaService.createMulterMiddleware())
      .forRoutes(
        { path: 'datasets', method: RequestMethod.POST },
        { path: 'media', method: RequestMethod.POST },
      );
  }
}
