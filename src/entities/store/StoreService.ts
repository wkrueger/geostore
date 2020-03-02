import { Injectable } from '@nestjs/common';
import { error } from 'src/_other/error';
import { Connection } from 'typeorm';
import { Dataset } from '../dataset/DatasetEntity';
import { StoreInstance } from './Instance';
import { Store } from './StoreEntity';

@Injectable()
export class StoreService {
  constructor(private conn: Connection) {}
  runner = this.conn.createQueryRunner();

  storeInstances: Record<string, StoreInstance> = {};

  getStoreInstance(meta: Store) {
    if (this.storeInstances[meta.code]) return this.storeInstances[meta.code];
    this.storeInstances[meta.code] = new StoreInstance(meta);
    return this.storeInstances[meta.code];
  }

  async create(i: { code: string }) {
    const meta = new Store();
    meta.code = i.code;
    await meta.save();

    const instance = this.getStoreInstance(meta);
    const runner = this.conn.createQueryRunner('master');
    await instance.createTable(runner);
    return meta;
  }

  async remove(i: { id: number }) {
    const found = await Store.findOne({ id: i.id });
    if (!found) {
      throw error('NOT_FOUND', 'Store not found.');
    }

    const instance = this.getStoreInstance(found);
    const runner = this.conn.createQueryRunner('master');
    await instance.removeTable(runner);
    delete this.storeInstances[found.code];

    await found.remove();
  }

  async query(datasetId: number, geometryWkt?: string) {
    const dataset = await Dataset.findOne({
      relations: ['store'],
      where: { id: datasetId },
    });
    if (!dataset) {
      throw error('NOT_FOUND', 'Store not found.');
    }
    const instance = this.getStoreInstance(dataset.store);
    let query = this.conn
      .getRepository(instance.entitySchema)
      .createQueryBuilder('inst')
      .where('inst.dataset = :dataset', { dataset: datasetId });
    if (geometryWkt) {
      query = query.andWhere('ST_Intersects(inst.geometry, :g1)', {
        g1: geometryWkt,
      });
    }
    const results = query.execute();
    return results;
  }

  async dataTransaction(
    dataset: Dataset,
    fn: (helpers: Helpers) => Promise<void>,
  ) {
    const instance = this.getStoreInstance(dataset.store);
    try {
      await instance.tableExists(this.runner);
      await instance.dropIndices(this.runner);
      const schema = instance.entitySchema;
      let that = this;

      async function insertData(i: {
        lines: { geom: any; properties: any }[];
      }) {
        const values = i.lines.map(line => {
          return {
            geometry: line.geom,
            properties: line.properties,
            dataset: dataset.id,
          };
        });
        await that.conn
          .createQueryBuilder()
          .insert()
          .into(schema, ['geometry', 'properties', 'dataset'])
          .values(values)
          .execute();
      }
      const helpers = { insertData };
      await fn(helpers);
      await instance.restoreIndices(this.runner);
    } catch (err) {
      await instance.restoreIndices(this.runner);
      throw err;
    }
  }
}

export interface Helpers {
  insertData(i: { lines: { geom: any; properties: any }[] }): Promise<void>;
}
