import path from 'path';
import { ContextFactory } from '@proerd/nextpress-context';
import { dbContext } from './dbContext';
// import { redisContext } from './redisContext';
import { workerContext } from './workerContext';
import { serverContext } from './serverContext';

let _ctx: Nextpress.Context;

export function getContext() {
  if (_ctx) return _ctx;
  _ctx = ContextFactory({
    projectRoot: path.resolve(__dirname, '..', '..'),
    mappers: [serverContext, dbContext /*, redisContext*/, workerContext],
  });
  return _ctx;
}
