import { createContextMapper } from '@proerd/nextpress-context';

export const redisContext = createContextMapper({
  id: 'redis',
  envKeys: ['REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD'],
  optionalKeys: ['REDIS_HOST', 'REDIS_PORT'],
  envContext({ getKey }) {
    return {
      redis: {
        host: getKey('REDIS_HOST') || 'localhost',
        port: Number(getKey('REDIS_PORT')) || 6379,
        password: getKey('REDIS_PASSWORD')!,
      },
    };
  },
});

declare global {
  namespace Nextpress {
    interface CustomContext extends ReturnType<typeof redisContext['envContext']> {}
  }
}
