import type { Space } from '../../model/space.js';
import type { User } from '../../model/user.js';
import type {
  SpaceResponse,
  UserResponse,
} from '../../wire/in/space-response.js';

export function toSpace(response: SpaceResponse): Space {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    role: response.role,
    createdAt: new Date(response.createdAt),
    updatedAt: new Date(response.updatedAt),
  };
}

export function toUser(response: UserResponse): User {
  return {
    id: response.id,
    email: response.email,
    name: response.name,
    pictureUrl: response.pictureUrl,
  };
}
