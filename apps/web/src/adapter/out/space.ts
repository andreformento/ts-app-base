import type { SpaceDraft } from '../../model/space.js';
import type {
  CreateSpaceRequest,
  UpdateSpaceRequest,
} from '../../wire/out/space-request.js';

export function fromDraft(draft: SpaceDraft): CreateSpaceRequest {
  return { name: draft.name, description: draft.description };
}

export function fromPatch(patch: Partial<SpaceDraft>): UpdateSpaceRequest {
  const request: UpdateSpaceRequest = {};
  if (patch.name !== undefined) request.name = patch.name;
  if (patch.description !== undefined) request.description = patch.description;
  return request;
}
