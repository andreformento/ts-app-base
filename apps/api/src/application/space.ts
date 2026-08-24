import { Injectable } from '@nestjs/common';
import type { Membership } from '../model/membership.js';
import type { Result } from '../model/result.js';
import type {
  SpaceDraft,
  SpaceFailure,
  SpaceId,
  SpacePatch,
  SpaceView,
} from '../model/space.js';
import type { UserId } from '../model/user.js';
import { authorize } from '../logic/membership.js';
import { applyPatch, validateDraft } from '../logic/space.js';
import { err, ok } from '../logic/result.js';
import { SpaceDb } from '../diplomat/out/space.db.js';

@Injectable()
export class SpaceApplication {
  constructor(private readonly spaces: SpaceDb) {}

  async create(
    draft: SpaceDraft,
    userId: UserId,
  ): Promise<Result<SpaceView, SpaceFailure>> {
    const validated = validateDraft(draft);
    if (!validated.ok)
      return err<SpaceFailure, SpaceView>({
        of: 'space',
        rejection: validated.error,
      });

    const space = await this.spaces.create(validated.value, userId);
    return ok({ space, role: 'host' });
  }

  async list(userId: UserId): Promise<readonly SpaceView[]> {
    return this.spaces.listFor(userId);
  }

  async read(
    spaceId: SpaceId,
    userId: UserId,
  ): Promise<Result<SpaceView, SpaceFailure>> {
    const access = await this.reachable(spaceId, userId, 'read');
    if (!access.ok) return err(access.error);

    const space = await this.spaces.find(spaceId);

    if (space === null)
      return err<SpaceFailure, SpaceView>({
        of: 'access',
        rejection: { kind: 'not-a-member' },
      });
    return ok({ space, role: access.value.role });
  }

  async edit(
    spaceId: SpaceId,
    patch: SpacePatch,
    userId: UserId,
  ): Promise<Result<SpaceView, SpaceFailure>> {
    const access = await this.reachable(spaceId, userId, 'manage');
    if (!access.ok) return err(access.error);

    const space = await this.spaces.find(spaceId);
    if (space === null)
      return err<SpaceFailure, SpaceView>({
        of: 'access',
        rejection: { kind: 'not-a-member' },
      });

    const patched = applyPatch(space, patch);
    if (!patched.ok)
      return err<SpaceFailure, SpaceView>({
        of: 'space',
        rejection: patched.error,
      });

    const updated = await this.spaces.update(spaceId, patched.value);
    return ok({ space: updated, role: access.value.role });
  }

  async remove(
    spaceId: SpaceId,
    userId: UserId,
  ): Promise<Result<null, SpaceFailure>> {
    const access = await this.reachable(spaceId, userId, 'manage');
    if (!access.ok) return err(access.error);

    await this.spaces.remove(spaceId);
    return ok(null);
  }

  private async reachable(
    spaceId: SpaceId,
    userId: UserId,
    action: 'read' | 'manage',
  ): Promise<Result<Membership, SpaceFailure>> {
    const decision = authorize(
      await this.spaces.findMembership(spaceId, userId),
      action,
    );
    if (!decision.ok)
      return err<SpaceFailure, Membership>({
        of: 'access',
        rejection: decision.error,
      });
    return ok(decision.value);
  }
}
