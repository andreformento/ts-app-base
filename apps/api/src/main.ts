import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './diplomat/in/app.module.js';
import { CONFIGURATION, type Configuration } from './model/configuration.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableShutdownHooks();
  const config = app.get<Configuration>(CONFIGURATION);
  await app.listen(config.port);
}

void bootstrap();
