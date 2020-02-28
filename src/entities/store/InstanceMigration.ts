import { Store } from './StoreEntity';
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export function createInstanceMigration(entity: Store) {
  const InstanceMigration = class {
    tableName = 'instance_' + entity.code;

    async up(runner: QueryRunner) {
      await runner.createTable(
        new Table({
          name: this.tableName,
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true },
            { name: 'geometry', type: 'geometry' },
            { name: 'properties', type: 'jsonb' },
          ],
        }),
      );
      await runner.createIndex(
        this.tableName,
        new TableIndex({ columnNames: ['geometry'], isSpatial: true }),
      );
    }

    async down(runner: QueryRunner) {
      await runner.dropTable(this.tableName);
    }
  };

  return InstanceMigration;
}
