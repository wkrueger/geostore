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
    await new GpkgReader().read({
      async iterator(line) {
        let geom: any;
        let properties = {};
        Object.entries(line).forEach(([k, v]) => {
          if (k === 'geom') geom = v;
          else properties[k] = v;
        });
        await that.storeSvc.insertData({
          dataset,
          lines: [{ geom, properties }],
        });
      },
      absFilePath: i.media.getAbsFilePath(),
    });
    return dataset;
  }
}
