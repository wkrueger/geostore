import { Injectable } from '@nestjs/common';
import { Worker } from 'worker_threads';
import { EventServer } from '../EventServer';

@Injectable()
export class ThreadsEventServer extends EventServer<Worker> {
  postMessage(worker: Worker, msg: any) {
    worker.postMessage(msg);
  }

  createWorker(path, idx) {
    const worker = new Worker(path, { workerData: { id: idx } });
    worker.stdout.on('data', data => {
      this.logger.log(`Worker ${idx}: ${data}`);
    });
    worker.stderr.on('data', data => {
      this.logger.log(`Worker ${idx}: ${data}`);
    });
    return worker;
  }

  listenTo(worker: Worker, fn) {
    worker.addListener('message', fn);
  }
}
