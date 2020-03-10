import { createContextMapper } from '@proerd/nextpress-context';

export const dbContext = createContextMapper({
  id: 'db',
  envKeys: ['DB_NAME', 'DB_HOST', 'DB_USER', 'DB_PORT', 'DB_PASSWORD'],
  optionalKeys: ['DB_PORT', 'DB_HOST'],
  envContext({ getKey }) {
    const database =
      process.env.NODE_ENV == 'test' ? getKey('DB_NAME') + '_test' : getKey('DB_NAME');
    const out = {
      db: {
        database,
        host: getKey('DB_HOST') || '127.0.0.1',
        user: getKey('DB_USER')!,
        port: Number(getKey('DB_PORT')) || 5432,
        password: getKey('DB_PASSWORD')!,
      },
    };
    return out;
  },
});

declare global {
  namespace Nextpress {
    interface CustomContext extends ReturnType<typeof dbContext['envContext']> {}
  }
}
