import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './module';
import { ErrorInterceptor } from './interceptors/error.interceptor';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get config service
  const configService = app.get(ConfigService);
  
  // Configure CORS
  if (configService.corsEnabled) {
    app.enableCors({
      origin: configService.corsOrigin === '*' ? true : configService.corsOrigin,
      credentials: true,
    });
  }
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Global error interceptor
  app.useGlobalInterceptors(new ErrorInterceptor());
  
  const port = configService.port;
  const server = await app.listen(port);
  
  // Set server timeout to 6 minutes for long-running AI operations
  server.setTimeout(360000); // 6 minutes
  
  console.log(`🚀 BFF listening on http://localhost:${port}`);
  console.log(`📊 Environment: ${configService.nodeEnv}`);
  console.log(`⏱️  Server timeout: 360s`);
}

bootstrap().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
