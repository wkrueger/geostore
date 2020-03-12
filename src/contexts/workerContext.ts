import { createContextMapper } from '@proerd/nextpress-context';
import os from 'os';

export const workerContext = createContextMapper({
  id: 'worker',
  envKeys: ['WORKERS_NUM'],
  optionalKeys: ['WORKERS_NUM'],
  envContext({ getKey }) {
    return {
      workers: {
        num: Number(getKey('WORKERS_NUM')!) || Math.max(1, os.cpus().length - 1),
      },
    };
  },
});

declare global {
  namespace Nextpress {
    interface CustomContext extends ReturnType<typeof workerContext['envContext']> {}
  }
}
