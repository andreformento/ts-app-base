import { Inject, Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import type { AccessClaims } from '../../model/session.js';
import {
  CONFIGURATION,
  type Configuration,
} from '../../model/configuration.js';

const ISSUER = 'appname';

@Injectable()
export class TokenSigner {
  private readonly secret: Uint8Array;

  constructor(@Inject(CONFIGURATION) private readonly config: Configuration) {
    this.secret = new TextEncoder().encode(config.authSecret);
  }

  async sign(claims: AccessClaims, now: Date): Promise<string> {
    const issuedAt = Math.floor(now.getTime() / 1000);
    return new SignJWT({ sid: claims.sid })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(claims.sub)
      .setIssuer(ISSUER)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + this.config.accessTokenTtl)
      .sign(this.secret);
  }

  async read(token: string): Promise<AccessClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: ISSUER,
      });
      const sid = payload['sid'];
      if (typeof payload.sub !== 'string' || typeof sid !== 'string')
        return null;
      return { sub: payload.sub, sid };
    } catch {
      return null;
    }
  }
}
