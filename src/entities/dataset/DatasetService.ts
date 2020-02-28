import { Injectable } from '@nestjs/common';
import { GpkgReader } from 'src/_other/GpkgReader';
import { Media } from '../media/MediaEntity';
import { Operation } from '../operation/OperationEntity';
import { Store } from '../store/StoreEntity';
import { Dataset } from './DatasetEntity';

@Injectable()
export class DatasetService {
  constructor() {}

  async create(i: { store: Store; media: Media }) {
    const dataset = new Dataset();
    dataset.operation = new Operation();
    dataset.store = i.store;
    dataset.media = i.media;
    await dataset.save();

    await new GpkgReader().read({
      iterator(...args) {
        console.log(args);
      },
      absFilePath: i.media.getAbsFilePath(),
    });
  }
}
