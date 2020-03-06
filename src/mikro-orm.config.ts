import { Options } from 'mikro-orm';
import { getContext } from './contexts/getContext';
import { Dataset } from './entities/_orm/DatasetEntity';
import { Media } from './entities/_orm/MediaEntity';
import { Operation } from './entities/_orm/OperationEntity';
import { Store } from './entities/_orm/StoreEntity';
import { Mapfile } from './entities/_orm/MapfileEntity';
import { MapfileLayer } from './entities/_orm/LayerEntity';

const ctx = getContext();

export const ormConfig /*: Options */ = {
  type: 'postgresql',
  host: ctx.db.host,
  port: ctx.db.port,
  user: ctx.db.user,
  password: ctx.db.password,
  dbName: ctx.db.database,
  entitiesDirsTs: ['src/entities/_orm'],
  entities: [Dataset, Media, Operation, Store, Mapfile, MapfileLayer],
  debug: true,
};

export default ormConfig;
