import { Logger } from '@nestjs/common';
import { getContext } from '../../contexts/getContext';

export abstract class EventServer<T> {
  logger = new Logger('EventServer');
  state: { jobs: number[] }[] = [];
  idcounter = 0;
  queue = [] as any[];
  workers?: T[];

  abstract postMessage(worker: T, msg: any);
  abstract createWorker(path: string, id: number): T;
  abstract listenTo(worker: T, fn: (msg: any) => any);

  getWorker(idx: number) {
    return this.workers?.[idx];
  }

  invoke(key: string, data: any) {
    const jobId = this.idcounter++;
    this.queue.push({ key: key, data, id: jobId });
    this.drain();
    return jobId;
  }

  drain() {
    while (this.queue.length) {
      const first = this.queue[0];
      const freeWorker = this.findFreeWorker();
      if (!freeWorker) return;
      this.postMessage(freeWorker, first);
      this.queue.shift();
    }
  }

  findFreeWorker() {
    for (let x = 0; x < this.state.length; x++) {
      const state = this.state[x];
      if (!state.jobs.length) return this.getWorker(x);
    }
    return null;
  }

  start(nworkers: number) {
    const ctx = getContext();
    this.logger.log(`Spawning ${nworkers} worker threads.`);
    this.workers = new Array(nworkers).fill(0).map((_, idx) => {
      const worker = this.createWorker(ctx.pathFromRoot('dist', 'workerEntry.js'), idx);

      this.listenTo(worker, msg => {
        if (msg.key === '_jobSuccess') {
          this.state[idx].jobs = this.state[idx].jobs.filter(x => x !== msg.data.id);
          this.logger.log(`Job ${msg.data.key}/${msg.data.id} success.`);
          this.drain();
        } else if (msg.key === '_jobError') {
          this.state[idx].jobs = this.state[idx].jobs.filter(x => x !== msg.data.id);
          this.logger.log(`Job ${msg.data.key}/${msg.data.id} failed with ${msg.data.error}`);
          this.drain();
        } else if (msg.key === '_invoke') {
          const jobId = this.invoke(msg.data.key, msg.data.data);
          this.postMessage(worker, {
            key: '_invokeSuccess',
            data: { invokeId: msg.data.invokeId, id: jobId },
          });
          this.drain();
        }
      });
      return worker;
    });
    this.state = this.workers.map(_ => ({ jobs: [] }));
  }
}
