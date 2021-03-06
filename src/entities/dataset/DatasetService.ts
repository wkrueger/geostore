import { Injectable } from '@nestjs/common'
import { EntityManager, EntityRepository } from 'mikro-orm'
import { InjectRepository } from 'nestjs-mikro-orm'
import { GpkgReader } from '../../_other/GpkgReader'
import { EventServer } from '../../_other/workers/EventServer'
import { StoreService } from '../store/StoreService'
import { Dataset } from '../_orm/DatasetEntity'
import { Media } from '../_orm/MediaEntity'
import { Operation } from '../_orm/OperationEntity'
import { Store } from '../_orm/StoreEntity'

@Injectable()
export class DatasetService {
  constructor(
    private storeSvc: StoreService,
    @InjectRepository(Dataset) private datasetRepo: EntityRepository<Dataset>,
    private em: EntityManager,
    private eventServer: EventServer<any>,
  ) {}

  /**
   * Populates geo data into the database.
   *
   * Operation is async (this method returns a scheduled job, not a finished result)
   * operation status is registered in the Operation entity.
   */
  async create(i: { store: Store; media: Media; notes: string }) {
    // const dataset = new Dataset();
    // wrap(dataset).assign(
    //   {
    //     state: OperationState.PENDING,
    //     store: i.store,
    //     media: i.media,
    //     notes: i.notes || '',
    //   },
    //   { em: this.em, mergeObjects: true },
    // );
    // dataset.operation = new Operation() as any;
    // await this.datasetRepo.persistAndFlush(dataset);
    const reader = new GpkgReader(i.media.getAbsFilePath())
    const tables = reader.getTables()
    const references: Record<string, number> = {}

    for (let table of tables) {
      const dataset = new Dataset()
      const operation = new Operation()
      dataset.media = i.media as any
      dataset.operation = operation as any
      dataset.notes = i.notes
      dataset.store = i.store as any
      dataset.sourceTable = table
      await this.em.persistAndFlush(dataset)
      references[table] = dataset.id
      this.eventServer.invoke('start', { dataset: dataset.id })
    }

    return references
  }

  async remove(id: number) {
    return this.eventServer.invoke('remove', { datasetId: id })
  }

  async calculateExtent(dataset: Dataset): Promise<number[]> {
    await this.datasetRepo.populate(dataset, 'store')
    const instance = this.storeSvc.getStoreInstance(await dataset.store.load())
    const knex = instance.getKnex(this.em)
    const [resp] = await instance
      .getQueryBuilder(this.em)
      .where({ datasetId: dataset.id })
      .select(knex.raw('ST_Extent(geometry) AS bextent'))
    if (!resp) return Dataset.DEFAULT_EXTENT
    if (!resp.bextent) {
      console.warn('warn: extent response null')
      return Dataset.DEFAULT_EXTENT
    }
    const split = resp.bextent
      .replace(/BOX\((.*)\)/g, '$1')
      .replace(/,/g, ' ')
      .split(' ')
      .map(Number)
    return split
  }
}
