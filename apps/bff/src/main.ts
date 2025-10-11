import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './module';
import { ErrorInterceptor } from './interceptors/error.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalInterceptors(new ErrorInterceptor());
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`BFF listening on http://localhost:${port}`);
}
bootstrap();
