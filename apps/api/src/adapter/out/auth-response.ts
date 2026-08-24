import type { User } from '../../model/user.js';
import { AuthResponse, UserResponse } from '../../wire/out/auth-response.js';

export function fromUser(user: User): UserResponse {
  return UserResponse.parse({
    id: user.id,
    email: user.email,
    name: user.name,
    pictureUrl: user.pictureUrl,
  });
}

export function fromTokens(
  user: User,
  accessToken: string,
  refreshToken: string,
): AuthResponse {
  return AuthResponse.parse({
    accessToken,
    refreshToken,
    user: fromUser(user),
  });
}
