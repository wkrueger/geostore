import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository, wrap } from 'mikro-orm';
import { InjectRepository } from 'nestjs-mikro-orm';
import { error } from '../../_other/error';
import { StoreService } from '../store/StoreService';
import { Dataset } from '../_orm/DatasetEntity';
import { Media } from '../_orm/MediaEntity';
import { Operation, OperationState } from '../_orm/OperationEntity';
import { Store } from '../_orm/StoreEntity';
import { ThreadsEventServer } from '../../_other/workers/threads/ThreadsEventServer';

@Injectable()
export class DatasetService {
  constructor(
    private storeSvc: StoreService,
    @InjectRepository(Dataset) private datasetRepo: EntityRepository<Dataset>,
    private em: EntityManager,
    private eventServer: ThreadsEventServer,
  ) {}

  /**
   * Populates geo data into the database.
   *
   * Operation is async (this method returns a scheduled job, not a finished result)
   * operation status is registered in the Operation entity.
   */
  async create(i: { store: Store; media: Media; notes: string }) {
    const dataset = new Dataset();
    wrap(dataset).assign(
      {
        state: OperationState.PENDING,
        store: i.store,
        media: i.media,
        notes: i.notes || '',
      },
      { em: this.em, mergeObjects: true },
    );
    dataset.operation = new Operation() as any;
    await this.datasetRepo.persistAndFlush(dataset);

    this.eventServer.invoke('getSize', { datasetId: dataset.id });

    return dataset;
  }

  async remove(id: number) {
    await this.em.transactional(async _em => {
      const found = await this.datasetRepo.findOne({ id });
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
