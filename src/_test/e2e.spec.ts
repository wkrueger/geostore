import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import fs from 'fs';
import Knex from 'knex';
import DbManager from 'knex-db-manager';
import { EntityManager, MikroORM } from 'mikro-orm';
import * as supertest from 'supertest';
import { promisify } from 'util';
import { AppModule } from '../app.module';
import { getContext } from '../contexts/getContext';
import faker from 'faker';
import { MapfileService } from '../entities/mapfile/MapfileService';

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
    const knex = dbManager.knexInstance();
    await knex.raw('CREATE EXTENSION postgis;');

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

  it('all', async () => {
    await createStore();
    await createDataset();
    // check for foreign key
    await removeStore();

    await createStore();
    const dsId1 = await createDataset();
    await removeDataset(dsId1);
    const dsId2 = await createDataset();

    const mapfile1 = await createMapfile(dsId2);
    await updateMapfile(mapfile1);
  }, 120000);

  async function createStore() {
    console.log('create store');
    await _agent
      .post('/stores')
      .send({ code: 'edificadas', label: 'Áreas edificadas' })
      .expect(201);
    const check = (await _agent.get('/stores')).body;
    const found = check.find(x => x.code === 'edificadas');
    expect(found).toBeTruthy();
  }

  async function createDataset() {
    console.log('create dataset');
    const ctx = getContext();
    const shapes = await promisify(fs.readFile)(ctx.pathFromRoot('dev', 'edificadas.gpkg'));
    const { body } = await _agent
      .post('/datasets')
      .field('storeCode', 'edificadas')
      .attach('file', shapes, { filename: 'edificadas.gpkg' })
      .expect(201);
    expect(body.id).toBeTruthy();
    let ready = false;
    while (!ready) {
      const datasetResp = await _agent.get(`/datasets?id=${body.id}`);
      expect(datasetResp.body).toHaveLength(1);
      expect(datasetResp.body[0].id).toEqual(body.id);
      if (datasetResp.body[0].operation.state !== 2) continue;
      else {
        ready = true;
      }
    }

    await queryDataset(body.id);
    return body.id;
  }

  async function removeDataset(datasetId: number) {
    console.log('remove dataset');
    await _agent.delete(`/datasets/${datasetId}`).expect(200);
    const check = await _agent.get(`/datasets?id=${datasetId}`);
    const found = check.body.find(x => x.id == datasetId);
    expect(found).toBeFalsy();

    const em: EntityManager = _app.get(EntityManager);
    const knex = (em.getConnection() as any).client;
    const dataFound = await knex.table('instance_edificadas').where({ datasetId });
    expect(dataFound).toHaveLength(0);
  }

  async function queryDataset(datasetId: number) {
    console.log('query dataset');
    const resp = await _agent.post(`/stores`).send({ datasetId, limit: 10 });
    expect(resp.body).toHaveLength(10);
  }

  async function removeStore() {
    const check = (await _agent.get('/stores')).body;
    const found = check.find(x => x.code === 'edificadas');
    await _agent.delete(`/stores/${found.id}`);
    const check2 = (await _agent.get('/stores')).body;
    const found2 = check2.find(x => x.code === 'edificadas');
    expect(found2).toBeFalsy();

    const knex = getKnex();
    const tableExists = await knex.schema.hasTable('instance_edificadas');
    expect(tableExists).toBeFalsy();
  }

  async function createMapfile(dsId: number) {
    console.log('create mapfile');
    const resp = await _agent
      .post('/mapfiles')
      .send({
        label: 'Main',
        layers: [{ dataset: dsId, classes: '  ' }],
      })
      .expect(200);
    expect(resp.body.id).toBeTruthy();
    return resp.body.id;
  }

  async function updateMapfile(mapfileId: number) {
    console.log('update mapfile');
    const fakeClass = faker.name.firstName();
    const [existing] = await _app.get(MapfileService).list({ id: mapfileId });
    existing.layers[0].classes = fakeClass;
    await _agent
      .put(`/mapfiles/${mapfileId}`)
      .send(existing)
      .expect(200);
    const { body: resp } = await _agent.get(`/mapfiles?id=${mapfileId}`);
    expect(resp).toEqual(existing);
  }

  function getKnex() {
    const em: EntityManager = _app.get(EntityManager);
    const knex = (em.getConnection() as any).client;
    return knex as Knex;
  }
});
