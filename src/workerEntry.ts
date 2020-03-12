import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';
import { parentPort } from 'worker_threads';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  await app.init();

  parentPort?.on('close', () => {
    app.close();
  });
}

bootstrap();
