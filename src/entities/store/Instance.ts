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

  async tableExists(runner: QueryRunner) {
    const exists = await runner.hasTable(this.tableName);
    if (!exists) {
      await this.createTable(runner);
    }
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
    await runner.createIndex(
      this.tableName,
      new TableIndex({
        columnNames: ['geometry'],
        isSpatial: true,
        name: 'geom_main',
      }),
    );
  }

  async dropIndices(runner: QueryRunner) {
    try {
      await runner.dropIndices(this.tableName, [
        new TableIndex({ name: 'geom_main', columnNames: ['geometry'] }),
      ]);
    } catch (err) {}
  }

  async restoreIndices(runner: QueryRunner) {
    await this.dropIndices(runner);
    console.log('Restore indices...');
    await runner.createIndex(
      this.tableName,
      new TableIndex({
        columnNames: ['geometry'],
        isSpatial: true,
        name: 'geom_main',
      }),
    );
    console.log('Done.');
  }

  async removeTable(runner: QueryRunner) {
    await runner.dropTable(this.tableName);
  }
}
