import type { SessionEntity } from './entities/session.entity';
import type { UserEntity } from './entities/user.entity';

export type StoredUser = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly pictureUrl: string | null;
};

export function toUserEntity(user: StoredUser): UserEntity {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    pictureUrl: user.pictureUrl,
  };
}

export function toSessionEntity(
  user: StoredUser,
  accessToken: string,
  refreshToken: string,
): SessionEntity {
  return { accessToken, refreshToken, user: toUserEntity(user) };
}
