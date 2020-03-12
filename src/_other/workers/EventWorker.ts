import { v4 } from 'uuid';
import { Logger } from '@nestjs/common';

export interface Handler {
  (data: any, key: string, jobId): Promise<void>;
}
export interface ErrorHandler {
  (i: { data; error; key }): Promise<void>;
}

export abstract class EventWorker<T> {
  handlers: Record<string, Handler> = {};
  errorHandler: ErrorHandler = async i => console.error(i);
  logger = new Logger('EventWorker');

  setHandler(key: string, handler: Handler) {
    this.handlers[key] = handler;
  }

  setErrorHandler(i: ErrorHandler) {
    this.errorHandler = i;
  }

  /** redirects the request up to the server */
  invokeHandler(key: string, data: any) {
    const invokeId = v4();
    this.postToParent({ key: '_invoke', data: { key, data, invokeId } });
    return new Promise<number>(resolve => {
      let listener = this.listenToParent(msg => {
        if (msg.key === '_invokeSuccess' && msg.data?.invokeId === invokeId) {
          resolve(msg.id);
          listener?.close();
        }
      });
    });
  }

  start() {
    this.listenToParent(async (msg: { key; data; id }) => {
      try {
        const runner = this.handlers[msg.key];
        if (!runner) {
          throw Error('No handler found for ' + msg.key);
        }
        this.logger.log(`Worker ${this.getMyId()} - Starting ${msg.key}/${msg.id}.`);
        await runner(msg.data, msg.key, msg.id);
        this.logger.log(`Worker ${this.getMyId()} - Finished ${msg.key}/${msg.id}.`);
        this.postToParent({ key: '_jobSuccess', data: { id: msg.id, key: msg.key } });
      } catch (err) {
        this.logger.error(`Worker ${this.getMyId()} - Failed ${msg.key}/${msg.id}.`);
        this.postToParent({
          key: '_jobError',
          data: { id: msg.id, key: msg.key, error: String(err) },
        });
      }
    });
  }

  abstract getMyId(): number;
  abstract postToParent(msg: any): void;
  abstract listenToParent(msg): { close() };
}
