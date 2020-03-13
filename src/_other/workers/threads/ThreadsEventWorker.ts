import { parentPort, workerData } from 'worker_threads';
import { EventWorker } from '../EventWorker';

// i frst tried threads but sqlite had trouble loading native extension
export class ThreadsEventWorker extends EventWorker<Worker> {
  getMyId() {
    return workerData.id;
  }

  postToParent(msg) {
    parentPort?.postMessage(msg);
  }

  listenToParent(fn: (msg: any) => any) {
    const listener = parentPort?.addListener('message', fn);
    return {
      close() {
        listener?.off('message', fn);
      },
    };
  }
}
