import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import type { IdentityClaims } from './auth.rules';

@Injectable()
export class IdentityService {
  private readonly jwks: JWTVerifyGetKey;

  constructor(config: ConfigService) {
    this.jwks = createRemoteJWKSet(
      new URL(config.getOrThrow<string>('OIDC_JWKS_URL')),
    );
  }

  async readClaims(idToken: string): Promise<IdentityClaims | null> {
    try {
      const { payload } = await jwtVerify(idToken, this.jwks);
      return payload;
    } catch {
      return null;
    }
  }
}
