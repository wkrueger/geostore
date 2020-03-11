import { EntityManager } from 'mikro-orm';
import { error } from '../../_other/error';
import { Store } from '../_orm/StoreEntity';
import knex from 'knex';

export class StoreInstance {
  constructor(public store: Store) {
    if (!this.store.code) throw error('INVALID_STORE_INSTANCE', 'Empty store code.');
  }
  tableName = 'instance_' + this.store.code;

  async tableExists(em: EntityManager) {
    const knex = this.getKnex(em);
    const exists = await knex.schema.hasTable(this.tableName);
    if (!exists) {
      await this.createTable(em);
    }
  }

  async createTable(em: EntityManager) {
    const knex = this.getKnex(em);
    await knex.schema.createTable(this.tableName, table => {
      table.increments();
      table.specificType('geometry', 'geometry');
      table.jsonb('properties');
      table
        .integer('datasetId')
        .references('dataset.id')
        // .index()
        .onDelete('CASCADE');
    });
  }

  async dropIndices() {}

  async restoreIndices() {}

  async removeTable(em: EntityManager) {
    const knex = this.getKnex(em);
    if (await knex.schema.hasTable(this.tableName)) {
      await knex.schema.dropTable(this.tableName);
    }
  }

  getKnex(em: EntityManager): knex {
    if (em.isInTransaction()) {
      return em.getTransactionContext()!;
    } else {
      const conn = em.getConnection() as any;
      return conn.client as knex;
    }
  }

  getQueryBuilder(em: EntityManager) {
    return this.getKnex(em).table(this.tableName);
  }
}
