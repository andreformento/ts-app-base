import { plainToInstance } from 'class-transformer';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsPositive,
  IsString,
  IsUrl,
  MinLength,
  validateSync,
} from 'class-validator';

export class Environment {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  PORT = 3000;

  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32)
  AUTH_SECRET!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  ACCESS_TOKEN_TTL = 900;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30;

  @IsUrl({ require_tld: false, require_protocol: true })
  OIDC_JWKS_URL!: string;

  @IsString()
  @MinLength(1)
  OIDC_ISSUER!: string;

  @IsString()
  @MinLength(1)
  OIDC_AUDIENCES!: string;

  @Transform(({ value }) => value !== 'false')
  @IsBoolean()
  COOKIE_SECURE = true;
}

export function validateEnvironment(raw: Record<string, unknown>): Environment {
  const environment = plainToInstance(Environment, raw, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(environment, { skipMissingProperties: false });

  if (errors.length > 0) {
    const problems = errors
      .map(
        (error) =>
          `  ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return environment;
}
