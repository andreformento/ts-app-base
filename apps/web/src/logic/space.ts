import type { ApiFailure } from '../model/api-failure.js';
import type { Result } from '../model/result.js';
import type { Space, SpaceDraft, SpaceRejection } from '../model/space.js';

export const NAME_MAX = 80;
export const DESCRIPTION_MAX = 2000;

export function validateDraft(
  draft: SpaceDraft,
): Result<SpaceDraft, SpaceRejection> {
  const name = draft.name.trim();
  if (name.length === 0) return { ok: false, error: { kind: 'name-empty' } };
  if (name.length > NAME_MAX)
    return { ok: false, error: { kind: 'name-too-long', max: NAME_MAX } };

  const description =
    draft.description === null ? null : draft.description.trim();
  if (description !== null && description.length > DESCRIPTION_MAX) {
    return {
      ok: false,
      error: { kind: 'description-too-long', max: DESCRIPTION_MAX },
    };
  }

  return {
    ok: true,
    value: { name, description: description === '' ? null : description },
  };
}

export function canManage(space: Space): boolean {
  return space.role === 'host';
}

export function fieldFor(code: string): 'name' | 'description' | null {
  if (code.startsWith('space.name')) return 'name';
  if (code.startsWith('space.description')) return 'description';
  return null;
}

export function describeRejection(rejection: SpaceRejection): string {
  switch (rejection.kind) {
    case 'name-empty':
      return 'Name is required.';
    case 'name-too-long':
      return `Name must be at most ${String(rejection.max)} characters.`;
    case 'description-too-long':
      return `Description must be at most ${String(rejection.max)} characters.`;
  }
}

export function asApiFailure(error: unknown): ApiFailure | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as Record<string, unknown>;
  const { status, code, message } = candidate;
  if (
    typeof status !== 'number' ||
    typeof code !== 'string' ||
    typeof message !== 'string'
  )
    return null;
  return { status, code, message };
}
