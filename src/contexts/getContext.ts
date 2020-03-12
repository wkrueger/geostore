import path from 'path';
import { ContextFactory } from '@proerd/nextpress-context';
import { dbContext } from './dbContext';
// import { redisContext } from './redisContext';
import { workerContext } from './workerContext';

let _ctx: Nextpress.Context;

export function getContext() {
  if (_ctx) return _ctx;
  _ctx = ContextFactory({
    projectRoot: path.resolve(__dirname, '..', '..'),
    mappers: [dbContext /*, redisContext*/, workerContext],
  });
  return _ctx;
}
