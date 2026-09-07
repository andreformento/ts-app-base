import type { components } from './api';

export type Space = components['schemas']['SpaceEntity'];
export type User = components['schemas']['UserEntity'];
export type Role = Space['role'];
export type Failure = components['schemas']['FailureEntity'];
export type CreateSpace = components['schemas']['CreateSpaceDto'];
export type UpdateSpace = components['schemas']['UpdateSpaceDto'];
