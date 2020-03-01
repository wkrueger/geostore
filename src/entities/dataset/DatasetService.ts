import { Injectable } from '@nestjs/common';
import { GpkgReader } from 'src/_other/GpkgReader';
import { Media } from '../media/MediaEntity';
import { Operation } from '../operation/OperationEntity';
import { Store } from '../store/StoreEntity';
import { Dataset } from './DatasetEntity';
import { StoreService } from '../store/StoreService';

@Injectable()
export class DatasetService {
  constructor(private storeSvc: StoreService) {}

  async create(i: { store: Store; media: Media }) {
    const dataset = new Dataset();
    const op = new Operation();
    await op.save();
    dataset.operation = op;
    dataset.store = i.store;
    dataset.media = i.media;
    await dataset.save();

    const that = this;
    let count = 0;
    let batch = [] as any[];
    that.storeSvc.dataTransaction(dataset, async helpers => {
      await new GpkgReader().read({
        async iterator(line) {
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
          if (count % 20 === 0) console.log('Inserted', count);
        },
        absFilePath: i.media.getAbsFilePath(),
      });
      if (batch.length) {
        await helpers.insertData({
          lines: batch,
        });
      }
    });
    return dataset;
  }
}
