import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';

const placeholders: Record<string, string> = {
  DATABASE_URL: 'postgresql://openapi:openapi@localhost:5432/openapi',
  AUTH_SECRET: 'openapi-emit-secret-at-least-32-characters',
  OIDC_JWKS_URL: 'http://localhost/jwks',
  OIDC_ISSUER: 'http://localhost',
  OIDC_AUDIENCES: 'openapi',
};

async function emit(target: string): Promise<void> {
  for (const [name, value] of Object.entries(placeholders))
    process.env[name] ??= value;

  const { AppModule } = await import('./app.module');
  const { createOpenApiDocument } = await import('./openapi');

  const app = await NestFactory.create(AppModule, { preview: true });
  writeFileSync(
    target,
    `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`,
  );
  await app.close();
}

void emit(process.argv[2] ?? 'openapi.json');
