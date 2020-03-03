import { Store } from '../_orm/StoreEntity';
import { EntityManager, EntitySchema, MikroORM } from 'mikro-orm';

export class StoreInstance {
  constructor(public store: Store, private orm: MikroORM) {}
  tableName = 'instance_' + this.store.code;

  entitySchema = new EntitySchema({
    name: this.tableName,
    properties: {
      id: { type: 'int', primary: true, generated: true },
      geometry: { type: 'geometry' },
      properties: { type: 'jsonb' },
      dataset: { reference: 'm:1', entity: 'Dataset' },
    },
  });

  async tableExists(em: EntityManager) {
    const ctx = em.getTransactionContext()!;
    const exists = await ctx.schema.hasTable(this.tableName);
    if (!exists) {
      await this.createTable();
    }
  }

  async createTable() {
    const generator = this.orm.getSchemaGenerator() as any;
    const meta = this.entitySchema.meta;
    await generator.createTable(meta);
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
