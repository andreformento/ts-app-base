import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';
import { IdentityProviderContainer } from './identity-provider';

const run = promisify(execFile);

let postgres: StartedPostgreSqlContainer;
let identity: IdentityProviderContainer;

export async function setup(project: TestProject): Promise<void> {
  postgres = await new PostgreSqlContainer('postgres:17').start();
  identity = await IdentityProviderContainer.start();

  const databaseUrl = postgres.getConnectionUri();
  await run(
    'node',
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    {
      env: { ...process.env, DATABASE_URL: databaseUrl },
    },
  );

  project.provide('databaseUrl', databaseUrl);
  project.provide('jwksUrl', identity.jwksUrl);
  project.provide('issuer', identity.issuer);
  project.provide('signingKey', await identity.exportSigningKey());
}

export async function teardown(): Promise<void> {
  await identity.stop();
  await postgres.stop();
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    jwksUrl: string;
    issuer: string;
    signingKey: string;
  }
}
