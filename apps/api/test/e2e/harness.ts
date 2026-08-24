import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/diplomat/in/app.module.js';
import { Database } from '../../src/diplomat/out/prisma.js';
import { IdentityProviderContainer } from './identity-provider.js';

const run = promisify(execFile);

export const WEB_CLIENT = 'web-client';
export const MOBILE_CLIENT = 'mobile-client';

export type Harness = {
  readonly app: INestApplication;
  readonly url: string;
  readonly identity: IdentityProviderContainer;
  reset: () => Promise<void>;

  addMember: (
    spaceId: string,
    userId: string,
    role: 'host' | 'guest',
  ) => Promise<void>;
  stop: () => Promise<void>;
};

export async function startHarness(): Promise<Harness> {
  const postgres: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:17',
  ).start();
  const identity = await IdentityProviderContainer.start();
  const databaseUrl = postgres.getConnectionUri();

  await run(
    'node',
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    {
      env: { ...process.env, DATABASE_URL: databaseUrl },
    },
  );

  process.env['DATABASE_URL'] = databaseUrl;
  process.env['AUTH_SECRET'] = 'a-test-secret-that-is-long-enough-to-pass';
  process.env['OIDC_JWKS_URL'] = identity.jwksUrl;
  process.env['OIDC_ISSUER'] = identity.issuer;
  process.env['OIDC_AUDIENCES'] = `${WEB_CLIENT},${MOBILE_CLIENT}`;
  process.env['COOKIE_SECURE'] = 'false';
  process.env['ACCESS_TOKEN_TTL'] = '900';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  await app.init();
  await app.listen(0);

  const url = await app.getUrl();

  return {
    app,
    url: url.replace('[::1]', '127.0.0.1'),
    identity,
    reset: async () => {
      const db = app.get(Database);
      await db.$executeRawUnsafe(
        'TRUNCATE TABLE memberships, sessions, spaces, users RESTART IDENTITY CASCADE',
      );
    },
    addMember: async (spaceId, userId, role) => {
      const db = app.get(Database);
      await db.membership.create({ data: { spaceId, userId, role } });
    },
    stop: async () => {
      await app.close();
      await identity.stop();
      await postgres.stop();
    },
  };
}
