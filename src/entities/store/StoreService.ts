import { Injectable } from '@nestjs/common';
import { Store } from './StoreEntity';
import { Connection, MigrationExecutor } from 'typeorm';
import { createInstanceMigration } from './InstanceMigration';
import { error } from 'src/_other/error';

@Injectable()
export class StoreService {
  constructor(private conn: Connection) {}

  async create(i: { code: string }) {
    const meta = new Store();
    meta.code = i.code;
    await meta.save();

    const migration = createInstanceMigration(meta);
    const runner = this.conn.createQueryRunner('master');
    await new migration().up(runner);
  }

  async remove(i: { id: number }) {
    const found = await Store.findOne({ id: i.id });
    if (!found) {
      throw error('NOT_FOUND', 'Store not found.');
    }

    const migration = createInstanceMigration(found);
    const runner = this.conn.createQueryRunner('master');
    await new migration().down(runner);

    await found.remove();
  }
}
