import { Injectable } from '@nestjs/common';
import { GpkgReader } from 'src/_other/GpkgReader';
import { Media } from '../media/MediaEntity';
import { Operation, OperationState } from '../_orm/OperationEntity';
import { Store } from '../_orm/StoreEntity';
import { Dataset } from '../_orm/DatasetEntity';
import { StoreService } from '../store/StoreService';
import { InjectRepository, Entity } from 'nestjs-mikro-orm';
import { EntityRepository } from 'mikro-orm';

@Injectable()
export class DatasetService {
  constructor(
    private storeSvc: StoreService,
    @InjectRepository(Operation)
    private operationRepo: EntityRepository<Operation>,
    @InjectRepository(Dataset) private datasetRepo: EntityRepository<Dataset>,
  ) {}

  async create(i: { store: Store; media: Media }) {
    const dataset = new Dataset();
    const op = new Operation();
    op.state = OperationState.PENDING;
    dataset.operation = op;
    dataset.store = i.store;
    dataset.media = i.media;
    await this.datasetRepo.persist(dataset);

    const that = this;
    let count = 0;
    let batch = [] as any[];
    that.storeSvc.dataTransaction(dataset, async helpers => {
      await new GpkgReader()
        .read({
          async iterator(line, total) {
            let geom: any;
            let properties = {};
            Object.entries(line).forEach(([k, v]) => {
              if (k === 'geom') geom = v;
              else properties[k] = v;
            });
            batch.push({ geom, properties });
            if (batch.length % 10 === 0) {
              await helpers.insertData({
                lines: batch,
              });
              batch = [];
            }
            count++;
            if (count % 40 === 0) {
              console.log('Inserted', count);
              op.progress = count / total;
              await that.operationRepo.persist(op);
            }
          },
          absFilePath: i.media.getAbsFilePath(),
        })
        .then(async () => {
          if (batch.length) {
            await helpers.insertData({
              lines: batch,
            });
          }
          op.state = OperationState.COMPLETED;
          op.progress = 1;
          await that.operationRepo.persist(op);
        })
        .catch(err => {
          console.log('Operation errored', err);
          op.state = OperationState.ERRORED;
          op.message = String(err);
          that.operationRepo.persist(op);
        });
    });
    return dataset;
  }
}
