import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
  });
  const port = Number(process.env.API_PORT || 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`API available at http://localhost:${port}/api`);
}

void bootstrap();
