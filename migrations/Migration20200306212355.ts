import { Migration } from 'mikro-orm';

export class Migration20200306212355 extends Migration {

  async up(): Promise<void> {
    this.addSql('drop table if exists "instance_edp_potential" cascade;');

    this.addSql('drop table if exists "layer" cascade;');

    this.addSql('drop table if exists "topology" cascade;');
  }

}
