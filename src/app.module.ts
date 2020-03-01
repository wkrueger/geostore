import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getContext } from './contexts/getContext';
import { Dataset } from './entities/dataset/DatasetEntity';
import { Media } from './entities/media/MediaEntity';
import { Operation } from './entities/operation/OperationEntity';
import { StoreController } from './entities/store/StoreController';
import { Store } from './entities/store/StoreEntity';
import { MediaService } from './entities/media/MediaService';
import { DatasetController } from './entities/dataset/DatasetController';
import { DatasetService } from './entities/dataset/DatasetService';
import { StoreService } from './entities/store/StoreService';

const ctx = getContext();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: ctx.db.host,
      port: ctx.db.port,
      username: ctx.db.user,
      password: ctx.db.password,
      database: ctx.db.database,
      entities: [Store, Operation, Media, Dataset],
      synchronize: true,
    }),
  ],
  controllers: [StoreController, DatasetController],
  providers: [MediaService, DatasetService, StoreService],
})
export class AppModule implements NestModule {
  constructor(private mediaService: MediaService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(this.mediaService.createMulterMiddleware())
      .forRoutes({ path: 'datasets', method: RequestMethod.POST });
  }
}
