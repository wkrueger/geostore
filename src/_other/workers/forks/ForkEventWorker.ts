import cp from 'child_process';
import { EventWorker } from '../EventWorker';

export class ForkEventWorker extends EventWorker<cp.ChildProcess> {
  _myId!: number;

  start() {
    const [arg] = process.argv.filter(x => x.startsWith('--workerId='));
    this._myId = Number(arg.split('=')[1]);
    super.start();
  }

  getMyId() {
    return this._myId;
  }

  listenToParent(fn) {
    const listener = process.addListener('message', fn);
    return {
      close() {
        listener.off('message', fn);
      },
    };
  }

  postToParent(msg) {
    process.send!(msg);
  }
}
