import { execFile, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Wait } from 'testcontainers';
import type { StartedTestContainer } from 'testcontainers';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';

const run = promisify(execFile);

const API_DIR = resolve(import.meta.dirname, '../../../api');
const API_PORT = 3001;
const PROVIDER_PORT = 8091;
const WEB_ORIGIN = 'http://127.0.0.1:4173';
const WEB_CLIENT = 'web-client';
const ISSUER = 'https://issuer.test';

export type Stack = {
  postgres: StartedPostgreSqlContainer;
  provider: StartedTestContainer;
  api: ChildProcess;
};

export async function startStack(): Promise<Stack> {
  const postgres = await new PostgreSqlContainer('postgres:17').start();
  const databaseUrl = postgres.getConnectionUri();

  await run(
    'node',
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    {
      cwd: API_DIR,
      env: { ...process.env, DATABASE_URL: databaseUrl },
    },
  );

  const { privateKey, publicKey } = await generateKeyPair('RS256', {
    extractable: true,
  });
  const jwk = await exportJWK(publicKey);
  const now = Math.floor(Date.now() / 1000);
  const idToken = await new SignJWT({
    email: 'person@example.test',
    email_verified: true,
    name: 'A Person',
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setSubject('person-1')
    .setIssuer(ISSUER)
    .setAudience(WEB_CLIENT)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const provider = await new GenericContainer('wiremock/wiremock:3.9.1')
    .withExposedPorts({ container: 8080, host: PROVIDER_PORT })
    .withWaitStrategy(Wait.forHttp('/__admin/mappings', 8080))
    .start();

  const providerBase = `http://127.0.0.1:${String(PROVIDER_PORT)}`;
  await stub(providerBase, {
    request: { method: 'GET', url: '/jwks' },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: {
        keys: [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }],
      },
    },
  });
  await stub(providerBase, {
    request: { method: 'GET', urlPathPattern: '/authorize.*' },
    response: {
      status: 302,
      headers: { Location: `${WEB_ORIGIN}/?id_token=${idToken}` },
    },
  });

  const api = spawn('node', ['dist/main.js'], {
    cwd: API_DIR,
    env: {
      ...process.env,
      PORT: String(API_PORT),
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: 'a-test-secret-that-is-long-enough-to-pass',
      OIDC_JWKS_URL: `${providerBase}/jwks`,
      OIDC_ISSUER: ISSUER,
      OIDC_AUDIENCES: WEB_CLIENT,
      COOKIE_SECURE: 'false',
    },
    stdio: 'inherit',
  });

  await waitForApi();
  return { postgres, provider, api };
}

export async function stopStack(stack: Stack): Promise<void> {
  stack.api.kill('SIGTERM');
  await stack.provider.stop();
  await stack.postgres.stop();
}

async function stub(base: string, mapping: unknown): Promise<void> {
  const response = await fetch(`${base}/__admin/mappings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(mapping),
  });
  if (!response.ok)
    throw new Error(`Could not create stub: ${String(response.status)}`);
}

async function waitForApi(): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(
        `http://127.0.0.1:${String(API_PORT)}/health`,
      );
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error('The api did not become healthy.');
}
