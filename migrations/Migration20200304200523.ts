import { Migration } from 'mikro-orm';

export class Migration20200304200523 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table "dataset" ("id" serial primary key, "store_id" int4 not null, "operation_id" int4 null, "media_id" varchar(255) not null, "created_at" timestamptz(0) not null);',
    );
    this.addSql(
      'create table "media" ("uuid" varchar(255) not null, "extension" varchar(255) not null);',
    );
    this.addSql(
      'alter table "media" add constraint "media_pkey" primary key ("uuid");',
    );
    this.addSql(
      'create table "operation" ("id" serial primary key, "state" int2 not null, "progress" float not null default 0, "message" varchar(255) null, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null);',
    );
    this.addSql(
      'create table "store" ("id" serial primary key, "code" varchar(255) not null);',
    );

    this.addSql(
      'alter table "dataset" add constraint "dataset_operation_id_unique" unique ("operation_id");',
    );
    this.addSql(
      'alter table "dataset" add constraint "dataset_media_id_unique" unique ("media_id");',
    );
    this.addSql(
      'alter table "dataset" add constraint "dataset_store_id_foreign" foreign key ("store_id") references "store" ("id") on update cascade;',
    );
    this.addSql(
      'alter table "dataset" add constraint "dataset_operation_id_foreign" foreign key ("operation_id") references "operation" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "dataset" add constraint "dataset_media_id_foreign" foreign key ("media_id") references "media" ("uuid") on update cascade;',
    );
    this.addSql(
      'alter table "store" add constraint "store_code_unique" unique ("code");',
    );
  }
}
