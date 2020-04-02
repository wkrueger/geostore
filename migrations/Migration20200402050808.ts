import { Migration } from 'mikro-orm';

export class Migration20200402050808 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "dataset" ("id" serial primary key, "store_id" int4 not null, "operation_id" int4 null, "media_id" varchar(255) not null, "created_at" timestamptz(0) not null, "extent" varchar(255) null, "notes" varchar(255) null);');
    this.addSql('alter table "dataset" add constraint "dataset_operation_id_unique" unique ("operation_id");');
    this.addSql('alter table "dataset" add constraint "dataset_media_id_unique" unique ("media_id");');

    this.addSql('create table "media" ("uuid" varchar(255) not null, "extension" varchar(255) not null);');
    this.addSql('alter table "media" add constraint "media_pkey" primary key ("uuid");');

    this.addSql('create table "operation" ("id" serial primary key, "state" int2 not null, "progress" float not null default 0, "message" varchar(255) null, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "info" json null);');

    this.addSql('create table "store" ("id" serial primary key, "code" varchar(255) not null, "label" varchar(255) not null, "projection_code" varchar(255) null default \'epsg:4326\');');
    this.addSql('alter table "store" add constraint "store_code_unique" unique ("code");');

    this.addSql('create table "mapfile" ("id" serial primary key, "label" varchar(255) not null, "custom_template" text null);');

    this.addSql('create table "mapfile_layer" ("id" serial primary key, "mapfile_id" int4 null, "code" varchar(255) null, "label" varchar(255) not null, "dataset_id" int4 null, "store_id" int4 null, "classes" text not null default \'\');');
    this.addSql('alter table "mapfile_layer" add constraint "mapfile_layer_dataset_id_unique" unique ("dataset_id");');
    this.addSql('alter table "mapfile_layer" add constraint "mapfile_layer_store_id_unique" unique ("store_id");');

    this.addSql('alter table "dataset" add constraint "dataset_store_id_foreign" foreign key ("store_id") references "store" ("id") on update cascade;');
    this.addSql('alter table "dataset" add constraint "dataset_operation_id_foreign" foreign key ("operation_id") references "operation" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "dataset" add constraint "dataset_media_id_foreign" foreign key ("media_id") references "media" ("uuid") on update cascade;');

    this.addSql('alter table "mapfile_layer" add constraint "mapfile_layer_mapfile_id_foreign" foreign key ("mapfile_id") references "mapfile" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "mapfile_layer" add constraint "mapfile_layer_dataset_id_foreign" foreign key ("dataset_id") references "dataset" ("id") on update cascade on delete set null;');
    this.addSql('alter table "mapfile_layer" add constraint "mapfile_layer_store_id_foreign" foreign key ("store_id") references "store" ("id") on update cascade on delete set null;');
  }

}
