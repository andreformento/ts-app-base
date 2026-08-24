import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '../model/result.js';
import type { IdentityRejection, User } from '../model/user.js';
import type { SessionRejection, Tokens } from '../model/session.js';
import type { Credentials } from '../model/credentials.js';
import { readAccessToken, readRefreshToken } from '../logic/credentials.js';
import { acceptIdentity } from '../logic/identity.js';
import { acceptSession, expiryFrom } from '../logic/session.js';
import { err, ok } from '../logic/result.js';
import { IdentityProvider } from '../diplomat/out/identity.js';
import { TokenSigner } from '../diplomat/out/token.js';
import { SessionDb } from '../diplomat/out/session.db.js';
import { UserDb } from '../diplomat/out/user.db.js';
import { CONFIGURATION, type Configuration } from '../model/configuration.js';

@Injectable()
export class AuthApplication {
  constructor(
    private readonly identityProvider: IdentityProvider,
    private readonly tokens: TokenSigner,
    private readonly sessions: SessionDb,
    private readonly users: UserDb,
    @Inject(CONFIGURATION) private readonly config: Configuration,
  ) {}

  async authenticate(
    idToken: string,
    now: Date,
  ): Promise<Result<Tokens, IdentityRejection>> {
    const claims = await this.identityProvider.readClaims(idToken);
    if (claims === null)
      return err<IdentityRejection, Tokens>({ kind: 'issuer-mismatch' });

    const accepted = acceptIdentity(
      claims,
      {
        issuer: this.config.oidcIssuer,
        audiences: this.config.oidcAudiences,
      },
      now,
    );
    if (!accepted.ok) return err(accepted.error);

    const user = await this.users.upsert(accepted.value);
    return ok(await this.issue(user, now));
  }

  async refresh(
    refreshToken: string,
    now: Date,
  ): Promise<Result<Tokens, SessionRejection>> {
    const accepted = acceptSession(
      await this.sessions.findByToken(refreshToken),
      now,
    );
    if (!accepted.ok) return err(accepted.error);

    const user = await this.users.find(accepted.value.userId);
    if (user === null)
      return err<SessionRejection, Tokens>({ kind: 'unknown' });

    await this.sessions.revoke(accepted.value.id, now);
    return ok(await this.issue(user, now));
  }

  async resolveFrom(
    credentials: Credentials,
    now: Date,
  ): Promise<Result<User, SessionRejection>> {
    const token = readAccessToken(credentials);
    if (token === null) return err<SessionRejection, User>({ kind: 'unknown' });
    return this.resolveCaller(token, now);
  }

  async refreshFrom(
    credentials: Credentials,
    fromBody: string | null,
    now: Date,
  ): Promise<Result<Tokens, SessionRejection>> {
    const token = readRefreshToken(credentials, fromBody);
    if (token === null)
      return err<SessionRejection, Tokens>({ kind: 'unknown' });
    return this.refresh(token, now);
  }

  async logoutFrom(
    credentials: Credentials,
    fromBody: string | null,
    now: Date,
  ): Promise<void> {
    const token = readRefreshToken(credentials, fromBody);
    if (token !== null) await this.logout(token, now);
  }

  async logout(refreshToken: string, now: Date): Promise<void> {
    const existing = await this.sessions.findByToken(refreshToken);
    if (existing !== null && existing.revokedAt === null)
      await this.sessions.revoke(existing.id, now);
  }

  async resolveCaller(
    accessToken: string,
    now: Date,
  ): Promise<Result<User, SessionRejection>> {
    const claims = await this.tokens.read(accessToken);
    if (claims === null)
      return err<SessionRejection, User>({ kind: 'unknown' });
    return this.currentUser(claims.sid, claims.sub, now);
  }

  async currentUser(
    sessionId: string,
    userId: string,
    now: Date,
  ): Promise<Result<User, SessionRejection>> {
    const accepted = acceptSession(await this.sessions.find(sessionId), now);
    if (!accepted.ok) return err(accepted.error);
    if (accepted.value.userId !== userId)
      return err<SessionRejection, User>({ kind: 'unknown' });

    const user = await this.users.find(userId);
    if (user === null) return err<SessionRejection, User>({ kind: 'unknown' });
    return ok(user);
  }

  private async issue(user: User, now: Date): Promise<Tokens> {
    const refreshToken = SessionDb.newToken();
    const session = await this.sessions.create(
      user.id,
      refreshToken,
      expiryFrom(now, this.config.refreshTokenTtl),
    );
    const accessToken = await this.tokens.sign(
      { sub: user.id, sid: session.id },
      now,
    );
    return { accessToken, refreshToken, user };
  }
}
