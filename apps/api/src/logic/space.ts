import type {
  Space,
  SpaceDraft,
  SpacePatch,
  SpaceRejection,
} from '../model/space.js';
import type { Result } from '../model/result.js';
import { err, ok } from './result.js';

export const NAME_MAX = 80;
export const DESCRIPTION_MAX = 2000;

function checkName(name: string): SpaceRejection | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { kind: 'name-empty' };
  if (trimmed.length > NAME_MAX)
    return { kind: 'name-too-long', max: NAME_MAX };
  return null;
}

function checkDescription(description: string | null): SpaceRejection | null {
  if (description !== null && description.length > DESCRIPTION_MAX) {
    return { kind: 'description-too-long', max: DESCRIPTION_MAX };
  }
  return null;
}

export function validateDraft(
  draft: SpaceDraft,
): Result<SpaceDraft, SpaceRejection> {
  const nameProblem = checkName(draft.name);
  if (nameProblem !== null) return err(nameProblem);
  const descriptionProblem = checkDescription(draft.description);
  if (descriptionProblem !== null) return err(descriptionProblem);

  return ok({
    name: draft.name.trim(),
    description: normalize(draft.description),
  });
}

export function applyPatch(
  space: Space,
  patch: SpacePatch,
): Result<SpaceDraft, SpaceRejection> {
  if (patch.name === null && patch.description === null)
    return err({ kind: 'nothing-to-update' });

  const name = patch.name ?? space.name;
  const description = patch.description ?? space.description;

  return validateDraft({ name, description });
}

function normalize(description: string | null): string | null {
  if (description === null) return null;
  const trimmed = description.trim();
  return trimmed.length === 0 ? null : trimmed;
}
