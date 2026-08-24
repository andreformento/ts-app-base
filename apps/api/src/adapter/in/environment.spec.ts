import { describe, expect, it } from 'vitest';
import { describeRejection, toConfiguration } from './environment.js';

function environment(overrides: Record<string, string | undefined> = {}) {
  return {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    AUTH_SECRET: 'a-secret-that-is-at-least-32-characters',
    OIDC_JWKS_URL: 'https://issuer.test/jwks',
    OIDC_ISSUER: 'https://issuer.test',
    OIDC_AUDIENCES: 'web-client',
    ...overrides,
  };
}

describe('toConfiguration', () => {
  it('maps every variable and applies defaults', () => {
    const result = toConfiguration(environment());
    expect(result).toEqual({
      ok: true,
      value: {
        port: 3000,
        databaseUrl: 'postgresql://user:pass@localhost:5432/db',
        authSecret: 'a-secret-that-is-at-least-32-characters',
        accessTokenTtl: 900,
        refreshTokenTtl: 2_592_000,
        oidcJwksUrl: 'https://issuer.test/jwks',
        oidcIssuer: 'https://issuer.test',
        oidcAudiences: ['web-client'],
        cookieSecure: true,
      },
    });
  });

  it('splits and trims the audience allowlist, so a second client needs no code', () => {
    const result = toConfiguration(
      environment({ OIDC_AUDIENCES: ' web-client , mobile-client ' }),
    );
    expect(result.ok && result.value.oidcAudiences).toEqual([
      'web-client',
      'mobile-client',
    ]);
  });

  it('drops empty entries in the allowlist', () => {
    const result = toConfiguration(
      environment({ OIDC_AUDIENCES: 'web-client,,' }),
    );
    expect(result.ok && result.value.oidcAudiences).toEqual(['web-client']);
  });

  it('coerces numbers from their string form', () => {
    const result = toConfiguration(
      environment({ PORT: '8080', ACCESS_TOKEN_TTL: '60' }),
    );
    expect(result.ok && result.value.port).toBe(8080);
    expect(result.ok && result.value.accessTokenTtl).toBe(60);
  });

  it('reads COOKIE_SECURE as a boolean, defaulting to secure', () => {
    const secure = toConfiguration(environment());
    expect(secure.ok && secure.value.cookieSecure).toBe(true);
    const insecure = toConfiguration(environment({ COOKIE_SECURE: 'false' }));
    expect(insecure.ok && insecure.value.cookieSecure).toBe(false);
  });

  it('rejects a missing required variable', () => {
    const result = toConfiguration(environment({ DATABASE_URL: undefined }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.problems.map((p) => p.variable)).toContain(
      'DATABASE_URL',
    );
  });

  it('rejects a secret that is too short to be worth having', () => {
    const result = toConfiguration(environment({ AUTH_SECRET: 'too-short' }));
    expect(result.ok).toBe(false);
  });

  it('rejects a malformed jwks url', () => {
    const result = toConfiguration(environment({ OIDC_JWKS_URL: 'not-a-url' }));
    expect(result.ok).toBe(false);
  });

  it('rejects a non-numeric port', () => {
    expect(toConfiguration(environment({ PORT: 'abc' })).ok).toBe(false);
  });

  it('reports every problem at once, not just the first', () => {
    const result = toConfiguration({ OIDC_AUDIENCES: 'web-client' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.problems.length).toBeGreaterThan(2);
  });
});

describe('describeRejection', () => {
  it('names every offending variable in the message', () => {
    const result = toConfiguration({ OIDC_AUDIENCES: 'web-client' });
    if (result.ok) throw new Error('expected a rejection');
    const message = describeRejection(result.error);
    expect(message).toContain('DATABASE_URL');
    expect(message).toContain('AUTH_SECRET');
  });
});
