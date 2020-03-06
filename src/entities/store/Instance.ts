import { EntityManager } from 'mikro-orm';
import { error } from 'src/_other/error';
import { Store } from '../_orm/StoreEntity';
import knex from 'knex';

export class StoreInstance {
  constructor(public store: Store) {
    if (!this.store.code) throw error('INVALID_STORE_INSTANCE', 'Empty store code.');
  }
  tableName = 'instance_' + this.store.code;

  // entitySchema = new EntitySchema({
  //   name: this.tableName,
  //   properties: {
  //     id: { type: 'int', primary: true },
  //     geometry: { type: 'geometry' },
  //     properties: { type: 'jsonb' },
  //     dataset: { reference: 'm:1', entity: 'Dataset', inversedBy: 'instances' },
  //   },
  // });

  async tableExists(em: EntityManager) {
    const ctx = em.getTransactionContext()!;
    const exists = await ctx.schema.hasTable(this.tableName);
    if (!exists) {
      await this.createTable(em);
    }
  }

  async createTable(em: EntityManager) {
    const knex = em.getTransactionContext()!;
    await knex.schema.createTable(this.tableName, table => {
      table.increments();
      table.specificType('geometry', 'geometry');
      table.jsonb('properties');
      table
        .integer('datasetId')
        .references('dataset.id')
        .index()
        .onDelete('CASCADE');
    });
  }

  async dropIndices() {}

  async restoreIndices() {}

  async removeTable(em: EntityManager) {
    const ctx = em.getTransactionContext();
    if (await ctx?.schema.hasTable(this.tableName)) {
      await ctx?.schema.dropTable(this.tableName);
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
