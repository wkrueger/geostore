import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getContext } from './contexts/getContext';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const ctx = getContext();
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const options = new DocumentBuilder().setTitle('geostore').build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);

  await app.listen(ctx.server.port);
}
bootstrap();
