import type { UserEntity } from './user.entity';

export class SessionEntity {
  accessToken!: string;
  refreshToken!: string;
  user!: UserEntity;
}
