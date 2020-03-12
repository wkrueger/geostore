import { parentPort, workerData } from 'worker_threads';
import { EventWorker } from '../EventWorker';

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
        listener?.close();
      },
    };
  }
}
