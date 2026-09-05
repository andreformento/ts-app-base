import 'reflect-metadata';
import type { Server } from 'node:http';
import { ConfigService } from '@nestjs/config';
import { createApp } from './app';

async function bootstrap(): Promise<void> {
  const app = await createApp();

  const server = app.getHttpServer() as Server;
  const drain = (): void => {
    server.closeIdleConnections();
  };
  process.once('SIGTERM', drain);
  process.once('SIGINT', drain);

  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));
}

void bootstrap();
