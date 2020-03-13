import cp from 'child_process';
import { EventServer } from '../EventServer';

export class ForkEventServer extends EventServer<cp.ChildProcess> {
  createWorker(path, id) {
    const worker = cp.fork(path, ['--workerId=' + id]);
    // worker.stdout!.on('data', data => {
    //   this.logger.log(`Worker ${id}: ${data}`);
    // });
    // worker.stderr!.on('data', data => {
    //   this.logger.log(`Worker ${id}: ${data}`);
    // });
    return worker;
  }

  listenTo(worker: cp.ChildProcess, fn) {
    worker.on('message', fn);
  }

  postMessage(worker: cp.ChildProcess, msg: any) {
    worker.send(msg);
  }
}
