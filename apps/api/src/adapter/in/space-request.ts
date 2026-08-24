import type { SpaceDraft, SpacePatch } from '../../model/space.js';
import type {
  CreateSpaceRequest,
  UpdateSpaceRequest,
} from '../../wire/in/space-request.js';

export function toDraft(request: CreateSpaceRequest): SpaceDraft {
  return { name: request.name, description: request.description ?? null };
}

export function toPatch(request: UpdateSpaceRequest): SpacePatch {
  return {
    name: request.name ?? null,
    description: request.description ?? null,
  };
}
