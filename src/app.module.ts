import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getContext } from './contexts/getContext';
import { Store } from './entities/store/StoreEntity';
import { Operation } from './entities/operation/OperationEntity';
import { Media } from './entities/media/MediaEntity';
import { Dataset } from './entities/dataset/DatasetEntity';
import { StoreController } from './entities/store/StoreController';

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
  controllers: [StoreController],
  providers: [],
})
export class AppModule {}
