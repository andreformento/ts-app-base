import type {
  Configuration,
  ConfigurationRejection,
} from '../../model/configuration.js';
import type { Result } from '../../model/result.js';
import { Environment } from '../../wire/in/environment.js';

export function toConfiguration(
  source: Record<string, string | undefined>,
): Result<Configuration, ConfigurationRejection> {
  const parsed = Environment.safeParse(source);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        problems: parsed.error.issues.map((issue) => ({
          variable: issue.path.join('.') || '(root)',
          message: issue.message,
        })),
      },
    };
  }

  const environment = parsed.data;
  return {
    ok: true,
    value: {
      port: environment.PORT,
      databaseUrl: environment.DATABASE_URL,
      authSecret: environment.AUTH_SECRET,
      accessTokenTtl: environment.ACCESS_TOKEN_TTL,
      refreshTokenTtl: environment.REFRESH_TOKEN_TTL,
      oidcJwksUrl: environment.OIDC_JWKS_URL,
      oidcIssuer: environment.OIDC_ISSUER,
      oidcAudiences: environment.OIDC_AUDIENCES.split(',')
        .map((audience) => audience.trim())
        .filter((audience) => audience.length > 0),
      cookieSecure: environment.COOKIE_SECURE === 'true',
    },
  };
}

export function describeRejection(rejection: ConfigurationRejection): string {
  const problems = rejection.problems
    .map((problem) => `  ${problem.variable}: ${problem.message}`)
    .join('\n');
  return `Invalid environment configuration:\n${problems}`;
}
