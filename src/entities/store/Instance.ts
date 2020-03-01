import { QueryRunner, Table, TableIndex, EntitySchema } from 'typeorm';
import { Store } from './StoreEntity';

export class StoreInstance {
  constructor(public store: Store) {}
  tableName = 'instance_' + this.store.code;

  entitySchema = new EntitySchema({
    name: this.tableName,
    columns: {
      id: { type: 'int', primary: true, generated: true },
      geometry: { type: 'geometry' },
      properties: { type: 'jsonb' },
      dataset: { type: 'int' },
    },
  });

  _existsMemo;
  async tableExists(runner: QueryRunner) {
    if (this._existsMemo) return;
    const exists = await runner.hasTable(this.tableName);
    if (!exists) {
      await this.createTable(runner);
    }
    this._existsMemo = true;
  }

  async createTable(runner: QueryRunner) {
    await runner.createTable(
      new Table({
        name: this.tableName,
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true },
          { name: 'geometry', type: 'geometry' },
          { name: 'properties', type: 'jsonb' },
          { name: 'dataset', type: 'int', isNullable: false },
        ],
        indices: [{ columnNames: ['geometry'], isSpatial: true }],
        foreignKeys: [
          {
            columnNames: ['dataset'],
            referencedColumnNames: ['id'],
            referencedTableName: 'dataset',
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }

  async removeTable(runner: QueryRunner) {
    await runner.dropTable(this.tableName);
  }
}
