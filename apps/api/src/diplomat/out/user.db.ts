import { Injectable } from '@nestjs/common';
import type { Identity, User, UserId } from '../../model/user.js';
import { toUser } from '../../adapter/in/space-row.js';
import { Database } from './prisma.js';

@Injectable()
export class UserDb {
  constructor(private readonly db: Database) {}

  async upsert(identity: Identity): Promise<User> {
    const row = await this.db.user.upsert({
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
    return toUser(row);
  }

  async find(userId: UserId): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { id: userId } });
    return row === null ? null : toUser(row);
  }
}
