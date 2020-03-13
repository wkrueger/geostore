import { Logger } from '@nestjs/common';
import { getContext } from '../../contexts/getContext';

export abstract class EventServer<T> {
  logger = new Logger('EventServer');
  state: { jobs: number[] }[] = [];
  idcounter = 0;
  queue = [] as { key; data; id }[];
  workers?: T[];
  schedulesIdx = new Map<number, { job; reqs }>();

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
      const workerIdx = this.findFreeWorker();
      if (workerIdx === null) return;
      const worker = this.getWorker(workerIdx)!;
      this.state[workerIdx].jobs.push(first.id);
      this.postMessage(worker, first);
      this.queue.shift();
    }
  }

  /**
   * somewhat like Promise.all
   * pulled this to server in an attempt to reduce concurrency issues.
   */
  schedule(job: { key; data }, reqs: number[]) {
    let ref = { job, reqs };
    reqs.forEach(id => {
      this.schedulesIdx.set(id, ref);
    });
  }

  /** add schedules to queue when requirements met */
  drainSchedules(jobId: number) {
    const found = this.schedulesIdx.get(jobId);
    if (!found) return;
    found.reqs.splice(found.reqs.indexOf(jobId), 1);
    this.schedulesIdx.delete(jobId);
    if (!found.reqs.length) {
      this.invoke(found.job.key, found.job.data);
    }
  }

  findFreeWorker() {
    for (let x = 0; x < this.state.length; x++) {
      const state = this.state[x];
      if (!state.jobs.length) return x;
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
          this.drainSchedules(msg.data.id);
          this.drain();
        } else if (msg.key === '_jobError') {
          this.state[idx].jobs = this.state[idx].jobs.filter(x => x !== msg.data.id);
          this.logger.log(`Job ${msg.data.key}/${msg.data.id} failed with ${msg.data.error}`);
          this.drainSchedules(msg.data.id);
          this.drain();
        } else if (msg.key === '_invoke') {
          const jobId = this.invoke(msg.data.key, msg.data.data);
          this.postMessage(worker, {
            key: '_invokeSuccess',
            data: { invokeId: msg.data.invokeId, id: jobId },
          });
          this.drain();
        } else if (msg.key === '_schedule') {
          this.schedule(msg.data.job, msg.data.reqs);
          this.drain();
        }
      });
      return worker;
    });
    this.state = this.workers.map(_ => ({ jobs: [] }));
  }
}
