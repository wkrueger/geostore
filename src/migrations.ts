import { Post, Controller, Res } from '@nestjs/common';
import { MikroORM } from 'mikro-orm';
import { Response } from 'express';

@Controller('migrations')
export class MigrationsController {
  constructor(private orm: MikroORM) {}

  @Post()
  async run(@Res() res: Response) {
    const generator = this.orm.getSchemaGenerator();
    const dump = await generator.getUpdateSchemaSQL();
    // const migrator = this.orm.getMigrator();
    // await migrator.createMigration();
    res.setHeader('content-type', 'text/plain');
    res.send(dump);
  }
}

class Generator {
  async run() {
    const desiredState = await this.getDesiredState();
    const migratedState = await this.getMigratedState();
    const currentState = await this.getCurrentState();
  }

  async getDesiredState() {}

  async getMigratedState() {}

  async getCurrentState() {}
}
