import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Session, SessionId } from '../../model/session.js';
import type { UserId } from '../../model/user.js';
import { toSession } from '../../adapter/in/space-row.js';
import { Database } from './prisma.js';

@Injectable()
export class SessionDb {
  constructor(private readonly db: Database) {}

  static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  static newToken(): string {
    return randomBytes(32).toString('base64url');
  }

  async create(
    userId: UserId,
    token: string,
    expiresAt: Date,
  ): Promise<Session> {
    const row = await this.db.session.create({
      data: { userId, tokenHash: SessionDb.hash(token), expiresAt },
    });
    return toSession(row);
  }

  async findByToken(token: string): Promise<Session | null> {
    const row = await this.db.session.findUnique({
      where: { tokenHash: SessionDb.hash(token) },
    });
    return row === null ? null : toSession(row);
  }

  async find(sessionId: SessionId): Promise<Session | null> {
    const row = await this.db.session.findUnique({ where: { id: sessionId } });
    return row === null ? null : toSession(row);
  }

  async revoke(sessionId: SessionId, at: Date): Promise<void> {
    await this.db.session.update({
      where: { id: sessionId },
      data: { revokedAt: at },
    });
  }
}
