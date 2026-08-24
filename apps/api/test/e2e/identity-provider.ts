import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import type { CryptoKey } from 'jose';

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
      .withCommand(['--no-request-journal'])
      .withWaitStrategy(Wait.forHttp('/__admin/mappings', 8080))
      .start();

    const base = `http://${container.getHost()}:${String(container.getMappedPort(8080))}`;
    const response = await fetch(`${base}/__admin/mappings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: { method: 'GET', url: '/jwks' },
        response: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jwks),
        },
      }),
    });
    if (!response.ok)
      throw new Error(
        `Could not stub the JWKS endpoint: ${String(response.status)}`,
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
    name?: string | null;
    expiresInSeconds?: number;
    issuer?: string;
  }): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = {
      email_verified: claims.emailVerified ?? true,
    };
    if (claims.email !== undefined) payload['email'] = claims.email;
    else payload['email'] = `${claims.subject}@example.test`;
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

  async stop(): Promise<void> {
    await this.container.stop();
  }
}
