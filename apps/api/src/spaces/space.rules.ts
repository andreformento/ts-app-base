export const NAME_MAX = 80;
export const DESCRIPTION_MAX = 2000;

export type SpaceFields = {
  readonly name: string;
  readonly description: string | null;
};

export type SpacePatch = {
  readonly name?: string;
  readonly description?: string | null;
};

export function hasChanges(patch: SpacePatch): boolean {
  return patch.name !== undefined || patch.description !== undefined;
}

export function merge(current: SpaceFields, patch: SpacePatch): SpaceFields {
  return {
    name: patch.name ?? current.name,
    description:
      patch.description === undefined ? current.description : patch.description,
  };
}
