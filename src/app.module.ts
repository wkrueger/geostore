import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MikroOrmModule } from 'nestjs-mikro-orm';
import { DatasetController } from './entities/dataset/DatasetController';
import { DatasetService } from './entities/dataset/DatasetService';
import { MediaService } from './entities/media/MediaService';
import { Operation } from './entities/_orm/OperationEntity';
import { StoreController } from './entities/store/StoreController';
import { StoreService } from './entities/store/StoreService';
import { Dataset } from './entities/_orm/DatasetEntity';
import { Media } from './entities/_orm/MediaEntity';
import { Store } from './entities/_orm/StoreEntity';
import { ormConfig } from './mikro-orm.config';
import { APP_FILTER } from '@nestjs/core';
import { MainExceptionFilter } from './_other/MainExceptionFilter';

@Module({
  imports: [
    MikroOrmModule.forRoot(ormConfig),
    MikroOrmModule.forFeature({ entities: [Dataset, Media, Operation, Store] }),
  ],
  controllers: [StoreController, DatasetController],
  providers: [
    MediaService,
    DatasetService,
    StoreService,
    { provide: APP_FILTER, useClass: MainExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  constructor(private mediaService: MediaService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(this.mediaService.createMulterMiddleware())
      .forRoutes({ path: 'datasets', method: RequestMethod.POST });
  }
}
