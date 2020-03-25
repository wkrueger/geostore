import { Migration } from 'mikro-orm';

export class Migration20200325185646 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "mapfile_layer" add column "store_id" int4 null;');
    this.addSql('alter table "mapfile_layer" alter column "dataset_id" drop default;');
    this.addSql('alter table "mapfile_layer" alter column "dataset_id" drop not null;');
    this.addSql(
      'alter table "mapfile_layer" alter column "dataset_id" type int4 using ("dataset_id"::int4);',
    );
    this.addSql(
      'alter table "mapfile_layer" add constraint "mapfile_layer_store_id_unique" unique ("store_id");',
    );
  }
}
