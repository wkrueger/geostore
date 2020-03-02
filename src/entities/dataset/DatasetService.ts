import { Injectable } from '@nestjs/common';
import { GpkgReader } from 'src/_other/GpkgReader';
import { Media } from '../media/MediaEntity';
import { Operation, OperationState } from '../operation/OperationEntity';
import { Store } from '../store/StoreEntity';
import { Dataset } from './DatasetEntity';
import { StoreService } from '../store/StoreService';

@Injectable()
export class DatasetService {
  constructor(private storeSvc: StoreService) {}

  async create(i: { store: Store; media: Media }) {
    const dataset = new Dataset();
    const op = new Operation();
    op.state = OperationState.PENDING;
    await op.save();
    dataset.operation = op;
    dataset.store = i.store;
    dataset.media = i.media;
    await dataset.save();

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
              op.save();
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
          return op.save();
        })
        .catch(err => {
          console.log('Operation errored', err);
          op.state = OperationState.ERRORED;
          op.message = String(err);
          return op.save();
        });
    });
    return dataset;
  }
}
