import { Migration } from 'mikro-orm';

export class Migration20200312175323 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "operation" add column "info" json null;');
  }
}
