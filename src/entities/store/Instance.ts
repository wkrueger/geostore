import { Store } from '../_orm/StoreEntity';
import { EntityManager, EntitySchema, MikroORM } from 'mikro-orm';

export class StoreInstance {
  constructor(public store: Store) {}
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

  getQueryBuilder(em: EntityManager) {
    return em.getTransactionContext()?.table(this.tableName)!;
  }
}
