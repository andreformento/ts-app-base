import { GenericContainer, Wait } from 'testcontainers';
import type { StartedTestContainer } from 'testcontainers';
import {
  SignJWT,
  exportJWK,
  exportPKCS8,
  importPKCS8,
  generateKeyPair,
} from 'jose';
import type { CryptoKey } from 'jose';

export async function signIdToken(
  signingKey: string,
  claims: {
    subject: string;
    audience: string;
    issuer: string;
    email?: string | null;
    emailVerified?: boolean;
    name?: string;
    expiresInSeconds?: number;
  },
): Promise<string> {
  const key = await importPKCS8(signingKey, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    email:
      claims.email === undefined
        ? `${claims.subject}@example.test`
        : claims.email,
    email_verified: claims.emailVerified ?? true,
  };
  if (claims.name !== undefined) payload['name'] = claims.name;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setSubject(claims.subject)
    .setIssuer(claims.issuer)
    .setAudience(claims.audience)
    .setIssuedAt(now)
    .setExpirationTime(now + (claims.expiresInSeconds ?? 3600))
    .sign(key);
}

export class IdentityProviderContainer {
  private constructor(
    private readonly container: StartedTestContainer,
    private readonly privateKey: CryptoKey,
    readonly jwksUrl: string,
    readonly issuer: string,
  ) {}

  static async start(
    issuer = 'https://issuer.test',
  ): Promise<IdentityProviderContainer> {
    const { privateKey, publicKey } = await generateKeyPair('RS256', {
      extractable: true,
    });
    const jwk = await exportJWK(publicKey);
    const jwks = {
      keys: [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }],
    };

    const container = await new GenericContainer('wiremock/wiremock:3.9.1')
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp('/__admin/mappings', 8080))
      .start();

    const base = `http://${container.getHost()}:${String(container.getMappedPort(8080))}`;
    const stubbed = await fetch(`${base}/__admin/mappings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: { method: 'GET', url: '/jwks' },
        response: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          jsonBody: jwks,
        },
      }),
    });
    if (!stubbed.ok)
      throw new Error(
        `Could not stub the JWKS endpoint: ${String(stubbed.status)}`,
      );

    return new IdentityProviderContainer(
      container,
      privateKey,
      `${base}/jwks`,
      issuer,
    );
  }

  async idToken(claims: {
    subject: string;
    audience: string;
    email?: string | null;
    emailVerified?: boolean;
    name?: string;
    expiresInSeconds?: number;
    issuer?: string;
  }): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = {
      email:
        claims.email === undefined
          ? `${claims.subject}@example.test`
          : claims.email,
      email_verified: claims.emailVerified ?? true,
    };
    if (claims.name !== undefined) payload['name'] = claims.name;

    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject(claims.subject)
      .setIssuer(claims.issuer ?? this.issuer)
      .setAudience(claims.audience)
      .setIssuedAt(now)
      .setExpirationTime(now + (claims.expiresInSeconds ?? 3600))
      .sign(this.privateKey);
  }

  async foreignToken(subject: string, audience: string): Promise<string> {
    const { privateKey } = await generateKeyPair('RS256', {
      extractable: true,
    });
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({
      email: `${subject}@example.test`,
      email_verified: true,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject(subject)
      .setIssuer(this.issuer)
      .setAudience(audience)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);
  }

  async exportSigningKey(): Promise<string> {
    return exportPKCS8(this.privateKey);
  }

  async stop(): Promise<void> {
    await this.container.stop();
  }
}
