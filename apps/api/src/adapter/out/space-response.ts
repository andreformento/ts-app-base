import type { Space } from '../../model/space.js';
import type { Role } from '../../model/membership.js';
import {
  SpaceListResponse,
  SpaceResponse,
} from '../../wire/out/space-response.js';

export function fromSpace(space: Space, role: Role): SpaceResponse {
  return SpaceResponse.parse({
    id: space.id,
    name: space.name,
    description: space.description,
    role,
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString(),
  });
}

export function fromSpaces(
  entries: readonly { space: Space; role: Role }[],
): SpaceListResponse {
  return SpaceListResponse.parse({
    items: entries.map((e) => fromSpace(e.space, e.role)),
  });
}
