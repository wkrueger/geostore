import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import DbManager from 'knex-db-manager';
import { MikroORM } from 'mikro-orm';
import * as supertest from 'supertest';
import { AppModule } from '../app.module';
import { getContext } from '../contexts/getContext';
import fs from 'fs';
import { promisify } from 'util';

describe('All', () => {
  let _app: INestApplication;
  let _agent: ReturnType<typeof supertest.agent>;

  beforeAll(async () => {
    const ctx = getContext();
    const dbManager = DbManager.databaseManagerFactory({
      knex: {
        client: 'postgres',
        connection: ctx.db,
      },
      dbManager: {
        superUser: ctx.db.user,
        superPassword: ctx.db.password,
      },
    });
    try {
      await dbManager.dropDb();
    } catch (err) {
      console.log('db not dropped or did not exist', err);
    }
    await dbManager.createDb(ctx.db.database);
    await dbManager.close();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    _app = moduleRef.createNestApplication();
    await _app.init();
    const orm: MikroORM = moduleRef.get('MikroORM');
    await orm.getMigrator().up();
    // _requester = new Requester(_app);
    _agent = supertest.agent(_app.getHttpServer());
  });

  it('create store', async () => {
    await _agent
      .post('/stores')
      .send({ code: 'edificadas', label: 'Áreas edificadas' })
      .expect(201);
    const check = (await _agent.get('/stores')).body;
    const found = check.find(x => x.code === 'edificadas');
    expect(found).toBeTruthy();
  });

  it('create dataset', async () => {
    const ctx = getContext();
    const shapes = await promisify(fs.readFile)(ctx.pathFromRoot('dev', 'edificadas.gpkg'));
    const { body } = await _agent
      .post('/datasets')
      .field('storeCode', 'edificadas')
      .attach('file', shapes)
      .expect(201);
    expect(body.id).toBeTruthy();
    let ready = false;
    while (!ready) {
      const datasetResp = await _agent.get(`/datasets?id=${body.id}`);
      expect(datasetResp.body.id).toEqual(body.id);
      if (datasetResp.body.operation.state !== 2) continue;
      else {
        ready = true;
      }
    }
  });

  it('remove store', async () => {
    const check = (await _agent.get('/stores')).body;
    const found = check.find(x => x.code === 'edificadas');
    await _agent.delete(`/stores/${found.id}`);
    const check2 = (await _agent.get('/stores')).body;
    const found2 = check2.find(x => x.code === 'edificadas');
    expect(found2).toBeFalsy();
  });
});
