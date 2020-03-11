import { Injectable } from '@nestjs/common';
import { error } from '../../_other/error';
import { Dataset } from '../_orm/DatasetEntity';
import { StoreInstance } from './Instance';
import { Store } from '../_orm/StoreEntity';
import { InjectRepository } from 'nestjs-mikro-orm';
import { EntityRepository, EntityManager, MikroORM } from 'mikro-orm';
import wkx from 'wkx';
import { StoreQueryDto, CreateStoreDto } from './StoreDto';

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

  async create(i: CreateStoreDto) {
    const store = await this.em.transactional(async _em => {
      const store = new Store();
      store.code = i.code;
      store.label = i.label;
      await this.storeRepo.persistAndFlush(store);
      const instance = this.getStoreInstance(store);
      await instance.tableExists(_em);
      return store;
    });
    return store;
  }

  async remove(i: { id: number }) {
    const found = await this.storeRepo.findOne({ id: i.id });
    if (!found) throw error('NOT_FOUND', 'Store not found.');
    const instance = this.getStoreInstance(found);
    await instance.removeTable(this.em);
    delete this.storeInstances[found.code];
    await this.storeRepo.removeAndFlush(found);
  }

  async query({
    datasetId,
    storeId,
    storeCode,
    intersectsGeometry,
    limit,
    offset,
  }: // withArea,
  StoreQueryDto) {
    if (!datasetId && !storeId && !storeCode) {
      throw error('BAD_REQUEST', 'Either dataset or store id must be set.');
    }

    if (!datasetId) {
      const where = storeId ? { store: storeId } : { store: { code: storeCode } };
      const [found] = await this.datasetRepo.find(where, {
        orderBy: { createdAt: 'desc' },
        limit: 1,
        populate: ['store'],
      });
      if (!found) throw error('NO_DATASET', 'No dataset exists for this store.');
      datasetId = found.id;
    }

    const dataset = await this.datasetRepo.findOne({ id: datasetId });
    if (!dataset) throw error('NOT_FOUND', 'Store not found.');

    const instance = this.getStoreInstance(await dataset.store.load());
    const knex = instance.getKnex(this.em);
    let query = instance
      .getQueryBuilder(this.em)
      .where({ datasetId: datasetId })
      .select(
        'id',
        'datasetId',
        'properties',
        intersectsGeometry
          ? knex.raw('ST_AsGeoJSON(ST_Intersection(geometry, ?)) AS geometry', intersectsGeometry)
          : knex.raw('ST_ASGeoJSON(geometry) AS geometry'),
      )
      .limit(limit || 100);
    if (offset) {
      query = query.offset(offset);
    }
    if (intersectsGeometry) {
      query = query.andWhere(knex.raw('ST_Intersects(geometry, ?)', intersectsGeometry));
    }
    let results: any[] = await query;
    results = results.map(result => {
      const geometry = JSON.parse(result.geometry);
      (result.properties || {}).dataset = datasetId;
      return {
        type: 'Feature',
        geometry,
        properties: result.properties,
      };
    });
    return results;
  }

  async dataTransaction(dataset: Dataset, fn: (helpers: Helpers) => Promise<void>) {
    await this.em.transactional(async _em => {
      const instance = this.getStoreInstance(await dataset.store.load());
      const knex = instance.getKnex(_em);
      // await knex.raw('SET commit_delay TO 400;');
      try {
        await instance.tableExists(_em);
        await instance.dropIndices();

        async function insertData(i: { lines: { geom: any; properties: any }[] }) {
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
        // await knex.raw('SET synchronous_commit TO on;');
      } catch (err) {
        await instance.restoreIndices();
        // await knex.raw('SET synchronous_commit TO on;');
        throw err;
      }
    });
  }
}

export interface Helpers {
  insertData(i: { lines: { geom: any; properties: any }[] }): Promise<void>;
}
