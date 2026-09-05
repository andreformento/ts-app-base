import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { IdentityService } from './identity.service';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from './entities/user.entity';
import { toSessionEntity, toUserEntity } from './auth.mapper';
import { acceptIdentity, acceptSession, expiryFrom } from './auth.rules';
import type { Identity } from './auth.rules';
import type { SessionUser } from './session-user';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly identity: IdentityService,
    private readonly config: ConfigService,
  ) {}

  async authenticate(idToken: string, now: Date): Promise<SessionEntity> {
    const claims = await this.identity.readClaims(idToken);
    if (claims === null)
      throw new UnauthorizedException(
        'The provided identity was not accepted.',
      );

    const accepted = acceptIdentity(claims, this.policy(), now);
    if (!accepted.ok)
      throw new UnauthorizedException(
        'The provided identity was not accepted.',
      );

    const user = await this.upsert(accepted.value);
    return this.issue(user, now);
  }

  async refresh(refreshToken: string, now: Date): Promise<SessionEntity> {
    const stored = await this.prisma.session.findUnique({
      where: { tokenHash: hash(refreshToken) },
    });
    const accepted = acceptSession(stored, now);
    if (!accepted.ok)
      throw new UnauthorizedException('Your session is no longer valid.');

    const user = await this.prisma.user.findUnique({
      where: { id: accepted.value.userId },
    });
    if (user === null)
      throw new UnauthorizedException('Your session is no longer valid.');

    await this.prisma.session.update({
      where: { id: accepted.value.id },
      data: { revokedAt: now },
    });
    return this.issue(user, now);
  }

  async logout(refreshToken: string, now: Date): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: hash(refreshToken), revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async resolve(
    sessionId: string,
    userId: string,
    now: Date,
  ): Promise<SessionUser> {
    const stored = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    const accepted = acceptSession(stored, now);
    if (!accepted.ok || accepted.value.userId !== userId) {
      throw new UnauthorizedException('Your session is no longer valid.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user === null)
      throw new UnauthorizedException('Your session is no longer valid.');

    return {
      id: user.id,
      sessionId,
      email: user.email,
      name: user.name,
      pictureUrl: user.pictureUrl,
    };
  }

  toUser(user: SessionUser): UserEntity {
    return toUserEntity(user);
  }

  private policy() {
    return {
      issuer: this.config.getOrThrow<string>('OIDC_ISSUER'),
      audiences: this.config
        .getOrThrow<string>('OIDC_AUDIENCES')
        .split(',')
        .map((audience) => audience.trim())
        .filter((audience) => audience.length > 0),
    };
  }

  private async upsert(identity: Identity) {
    return this.prisma.user.upsert({
      where: { subject: identity.subject },
      create: {
        subject: identity.subject,
        email: identity.email,
        name: identity.name,
        pictureUrl: identity.pictureUrl,
      },
      update: {
        email: identity.email,
        name: identity.name,
        pictureUrl: identity.pictureUrl,
      },
    });
  }

  private async issue(
    user: {
      id: string;
      email: string;
      name: string;
      pictureUrl: string | null;
    },
    now: Date,
  ): Promise<SessionEntity> {
    const refreshToken = randomBytes(32).toString('base64url');
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hash(refreshToken),
        expiresAt: expiryFrom(
          now,
          this.config.getOrThrow<number>('REFRESH_TOKEN_TTL'),
        ),
      },
    });

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      sid: session.id,
    });

    return toSessionEntity(user, accessToken, refreshToken);
  }
}

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
