import { Injectable } from '@nestjs/common';
import { error } from 'src/_other/error';
import { Dataset } from '../_orm/DatasetEntity';
import { StoreInstance } from './Instance';
import { Store } from '../_orm/StoreEntity';
import { InjectRepository } from 'nestjs-mikro-orm';
import { EntityRepository, EntityManager, MikroORM } from 'mikro-orm';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Store) private storeRepo: EntityRepository<Store>,
    @InjectRepository(Dataset) private datasetRepo: EntityRepository<Dataset>,
    private em: EntityManager,
  ) {}

  storeInstances: Record<string, StoreInstance> = {};

  getStoreInstance(store: Store) {
    if (this.storeInstances[store.code]) return this.storeInstances[store.code];
    this.storeInstances[store.code] = new StoreInstance(store);
    return this.storeInstances[store.code];
  }

  async create(i: { code: string }) {
    const store = new Store();
    store.code = i.code;
    await this.storeRepo.persistAndFlush(store);
    const instance = this.getStoreInstance(store);
    await instance.createTable(this.em);
    return store;
  }

  async remove(i: { id: number }) {
    const found = await this.storeRepo.findOne({ id: i.id });
    if (!found) throw error('NOT_FOUND', 'Store not found.');
    const instance = this.getStoreInstance(found);
    await instance.removeTable(this.em);
    delete this.storeInstances[found.code];
    await this.storeRepo.remove(found);
  }

  async query(datasetId: number, geometryWkt?: string) {
    const dataset = await this.datasetRepo.findOne({ id: datasetId });
    if (!dataset) throw error('NOT_FOUND', 'Store not found.');
    const instance = this.getStoreInstance(dataset.store);
    let query = instance.getQueryBuilder(this.em).where({ dataset: datasetId });
    if (geometryWkt) {
      query = query.andWhere('ST_Intersects(inst.geometry, ?)', geometryWkt);
    }
    const results = await query;
    return results;
  }

  async dataTransaction(
    dataset: Dataset,
    fn: (helpers: Helpers) => Promise<void>,
  ) {
    await this.em.transactional(async _em => {
      const instance = this.getStoreInstance(dataset.store);
      try {
        await instance.tableExists(_em);
        await instance.dropIndices();

        async function insertData(i: {
          lines: { geom: any; properties: any }[];
        }) {
          const values = i.lines.map(line => {
            return {
              geometry: line.geom,
              properties: line.properties,
              datasetId: dataset.id,
            };
          });

          await instance.getQueryBuilder(_em).insert(values);
        }
        const helpers = { insertData };
        await fn(helpers);
        await instance.restoreIndices();
      } catch (err) {
        await instance.restoreIndices();
        throw err;
      }
    });
  }
}

export interface Helpers {
  insertData(i: { lines: { geom: any; properties: any }[] }): Promise<void>;
}
