import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import type { IdentityClaims } from '../../model/user.js';
import { toIdentityClaims } from '../../adapter/in/identity-claims.js';
import { IdentityClaimsPayload } from '../../wire/in/identity-claims.js';
import {
  CONFIGURATION,
  type Configuration,
} from '../../model/configuration.js';

@Injectable()
export class IdentityProvider {
  private readonly jwks: JWTVerifyGetKey;

  constructor(@Inject(CONFIGURATION) config: Configuration) {
    this.jwks = createRemoteJWKSet(new URL(config.oidcJwksUrl));
  }

  async readClaims(idToken: string): Promise<IdentityClaims | null> {
    try {
      const { payload } = await jwtVerify(idToken, this.jwks);
      const parsed = IdentityClaimsPayload.safeParse(payload);
      return parsed.success ? toIdentityClaims(parsed.data) : null;
    } catch {
      return null;
    }
  }
}
