import { Injectable } from '@nestjs/common';
import { GpkgReader } from 'src/_other/GpkgReader';
import { Media } from '../_orm/MediaEntity';
import { Operation, OperationState } from '../_orm/OperationEntity';
import { Store } from '../_orm/StoreEntity';
import { Dataset } from '../_orm/DatasetEntity';
import { StoreService } from '../store/StoreService';
import { InjectRepository, Entity } from 'nestjs-mikro-orm';
import { EntityRepository, EntityManager } from 'mikro-orm';
import { TimerTicker } from 'src/_other/TimerTicker';
import { error } from 'src/_other/error';
import wkx from 'wkx';
import _flatten from 'lodash/flatten';

@Injectable()
export class DatasetService {
  constructor(
    private storeSvc: StoreService,
    @InjectRepository(Operation)
    private operationRepo: EntityRepository<Operation>,
    @InjectRepository(Dataset) private datasetRepo: EntityRepository<Dataset>,
    private em: EntityManager,
  ) {}

  /**
   * Populates geo data into the database.
   *
   * Operation is async (this method returns a scheduled job, not a finished result)
   * operation status is registered in the Operation entity.
   */
  async create(i: { store: Store; media: Media }) {
    const dataset = new Dataset();
    const op = new Operation();
    op.state = OperationState.PENDING;
    dataset.operation = op;
    dataset.store = i.store;
    dataset.media = i.media;
    await this.datasetRepo.persistAndFlush(dataset);

    const that = this;
    let count = 0;
    let total = 1;
    let batch = [] as any[];
    const timerTicker = new TimerTicker(2000);
    timerTicker.onTick(() => {
      console.log('Inserted', count);
      op.progress = count / total;
      that.operationRepo.persistAndFlush(op);
    });
    that.storeSvc
      .dataTransaction(dataset, async helpers => {
        await new GpkgReader()
          .read({
            async iterator(line, _total) {
              total = _total;
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
            },
            absFilePath: i.media.getAbsFilePath(),
          })
          .then(async () => {
            if (batch.length) {
              await helpers.insertData({
                lines: batch,
              });
            }
          });
      })
      .then(async () => {
        const extent = await that.calculateExtent(dataset);
        dataset.extent = extent.join(' ');
        op.state = OperationState.COMPLETED;
        op.progress = 1;
        await that.operationRepo.persistAndFlush(op);
        await that.datasetRepo.persistAndFlush(dataset);
        timerTicker.finished();
      })
      .catch(err => {
        console.log('Operation errored', err);
        op.state = OperationState.ERRORED;
        op.message = String(err).substr(0, 254);
        that.operationRepo.persistAndFlush(op);
        timerTicker.finished();
      });
    await this.datasetRepo.populate(dataset, ['operation']);
    return dataset;
  }

  async remove(id: number) {
    await this.em.transactional(async _em => {
      const found = await this.datasetRepo.findOne({ id }, ['store']);
      if (!found) throw error('NOT_FOUND', 'Dataset not found.');
      const store = found.store;
      const inst = this.storeSvc.getStoreInstance(store);
      await inst.getQueryBuilder(_em).where({ datasetId: id });
      await this.datasetRepo.removeAndFlush(found);
    });
  }

  async calculateExtent(dataset: Dataset): Promise<number[]> {
    await this.datasetRepo.populate(dataset, 'store');
    const instance = this.storeSvc.getStoreInstance(dataset.store);
    const knex = instance.getKnex(this.em);
    const [resp] = await instance
      .getQueryBuilder(this.em)
      .where({ datasetId: dataset.id })
      .select(knex.raw('ST_Extent(geometry) AS bextent'));
    if (!resp) return Dataset.DEFAULT_EXTENT;
    const respjson = wkx.Geometry.parse(resp).toGeoJSON() as any;
    let coords: any[] = _flatten(respjson.coordinates);
    let coordsGroup = {} as any;
    coords.forEach((x, idx) => {
      const tgt = Math.floor(idx / 2);
      coordsGroup[tgt] = coordsGroup[tgt] || [];
      coordsGroup[tgt].push(x);
    });
    coordsGroup = Array.from(coordsGroup);
    return coordsGroup;
  }
}
