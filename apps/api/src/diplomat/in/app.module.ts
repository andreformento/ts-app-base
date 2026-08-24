import { Module } from '@nestjs/common';
import { AuthApplication } from '../../application/auth.js';
import { HealthApplication } from '../../application/health.js';
import { SpaceApplication } from '../../application/space.js';
import { Database } from '../out/prisma.js';
import { IdentityProvider } from '../out/identity.js';
import { SessionDb } from '../out/session.db.js';
import { SpaceDb } from '../out/space.db.js';
import { TokenSigner } from '../out/token.js';
import { UserDb } from '../out/user.db.js';
import {
  CONFIGURATION,
  type Configuration,
} from '../../model/configuration.js';
import {
  describeRejection,
  toConfiguration,
} from '../../adapter/in/environment.js';
import { AuthGuard } from './auth.guard.js';
import { AuthHttp } from './auth.http.js';
import { HealthHttp } from './health.http.js';
import { OpenApiHttp } from './openapi.http.js';
import { SpaceHttp } from './space.http.js';

export function configurationOf(
  source: Record<string, string | undefined>,
): Configuration {
  const result = toConfiguration(source);
  if (!result.ok) throw new Error(describeRejection(result.error));
  return result.value;
}

@Module({
  controllers: [AuthHttp, HealthHttp, OpenApiHttp, SpaceHttp],
  providers: [
    // eslint-disable-next-line no-restricted-properties -- the one sanctioned read of process.env
    { provide: CONFIGURATION, useFactory: () => configurationOf(process.env) },
    Database,
    IdentityProvider,
    TokenSigner,
    SessionDb,
    SpaceDb,
    UserDb,
    AuthApplication,
    HealthApplication,
    SpaceApplication,
    AuthGuard,
  ],
})

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- framework requirement
export class AppModule {}
