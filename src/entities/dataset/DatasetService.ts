import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository, wrap } from 'mikro-orm';
import { InjectRepository } from 'nestjs-mikro-orm';
import { error } from '../../_other/error';
import { GpkgReader } from '../../_other/GpkgReader';
import { TimerTicker } from '../../_other/TimerTicker';
import { StoreService } from '../store/StoreService';
import { Dataset } from '../_orm/DatasetEntity';
import { Media } from '../_orm/MediaEntity';
import { Operation, OperationState } from '../_orm/OperationEntity';
import { Store } from '../_orm/StoreEntity';

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
  async create(i: { store: Store; media: Media; notes: string }) {
    const dataset = new Dataset();
    const op = new Operation();
    wrap(dataset).assign(
      {
        state: OperationState.PENDING,
        operation: op,
        store: i.store,
        media: i.media,
        notes: i.notes || '',
      },
      { em: this.em, mergeObjects: true },
    );
    await this.datasetRepo.persistAndFlush(dataset);

    const that = this;
    let count = 0;
    let total = null as any;
    let batch = [] as any[];
    const timerTicker = new TimerTicker(2000);
    timerTicker.onTick(() => {
      console.log('Inserted', count);
      op.progress = total ? count / total : count;
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
        const d1 = await that.datasetRepo.findOne({ id: dataset.id });
        timerTicker.finished();
        if (!d1) return;
        d1.extent = extent.join(' ');
        const op1 = await that.operationRepo.findOne({ id: op.id });
        if (!op1) return;
        op1.state = OperationState.COMPLETED;
        op1.progress = 1;
        await that.operationRepo.persistAndFlush(op1);
        await that.datasetRepo.persistAndFlush(d1);
      })
      .catch(async err => {
        console.log('Operation errored', err);
        const op1 = await that.operationRepo.findOne({ id: op.id });
        timerTicker.finished();
        if (!op1) return;
        op1.state = OperationState.ERRORED;
        op1.message = String(err).substr(0, 254);
        that.operationRepo.persistAndFlush(op1);
      });
    await this.datasetRepo.populate(dataset, ['operation']);
    return dataset;
  }

  async remove(id: number) {
    await this.em.transactional(async _em => {
      const found = await this.datasetRepo.findOne({ id }, ['store']);
      if (!found) throw error('NOT_FOUND', 'Dataset not found.');
      const store = await found.store.load();
      const inst = this.storeSvc.getStoreInstance(store);
      await inst.getQueryBuilder(_em).where({ datasetId: id });
      await this.datasetRepo.removeAndFlush(found);
    });
  }

  async calculateExtent(dataset: Dataset): Promise<number[]> {
    await this.datasetRepo.populate(dataset, 'store');
    const instance = this.storeSvc.getStoreInstance(await dataset.store.load());
    const knex = instance.getKnex(this.em);
    const [resp] = await instance
      .getQueryBuilder(this.em)
      .where({ datasetId: dataset.id })
      .select(knex.raw('ST_Extent(geometry) AS bextent'));
    if (!resp) return Dataset.DEFAULT_EXTENT;
    const split = resp.bextent
      .replace(/BOX\((.*)\)/g, '$1')
      .replace(/,/g, ' ')
      .split(' ')
      .map(Number);
    return split;
  }
}
