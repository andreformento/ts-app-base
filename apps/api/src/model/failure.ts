import type { AccessRejection } from './membership.js';
import type { IdentityRejection } from './user.js';
import type { ParseRejection } from './parse.js';
import type { SessionRejection } from './session.js';
import type { SpaceRejection } from './space.js';

export type Failure =
  | { readonly of: 'space'; readonly rejection: SpaceRejection }
  | { readonly of: 'access'; readonly rejection: AccessRejection }
  | { readonly of: 'identity'; readonly rejection: IdentityRejection }
  | { readonly of: 'session'; readonly rejection: SessionRejection }
  | { readonly of: 'not-found'; readonly resource: string }
  | { readonly of: 'parse'; readonly rejection: ParseRejection };

export type RenderedFailure = {
  readonly status: number;
  readonly body: unknown;
};
