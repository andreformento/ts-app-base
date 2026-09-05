import { useState } from 'react';
import { mayManage, roleLabel } from '../../lib/space.rules';
import { SpaceForm } from './SpaceForm';
import { useDeleteSpace, useSpaces } from './use-spaces';
import type { Space } from '../../types/space';

export function SpaceList() {
  const spaces = useSpaces();
  const remove = useDeleteSpace();
  const [editing, setEditing] = useState<Space | null>(null);

  if (spaces.isPending) return <p>Loading spaces…</p>;
  if (spaces.isError) return <p role="alert">Could not load your spaces.</p>;

  return (
    <div className="flex flex-col gap-8">
      <SpaceForm
        key={editing?.id ?? 'new'}
        editing={editing}
        onDone={() => {
          setEditing(null);
        }}
      />

      <section aria-labelledby="spaces-heading" className="flex flex-col gap-3">
        <h2 id="spaces-heading" className="text-lg font-semibold">
          Your spaces
        </h2>

        {spaces.data.length === 0 ? (
          <p>You have no spaces yet. Create one above.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {spaces.data.map((space) => (
              <li
                key={space.id}
                className="flex items-center justify-between rounded border p-3"
              >
                <div>
                  <p className="font-medium">{space.name}</p>
                  {space.description !== null && (
                    <p className="text-sm text-neutral-600">
                      {space.description}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500">
                    {roleLabel(space.role)}
                  </p>
                </div>
                {mayManage(space) && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Edit ${space.name}`}
                      onClick={() => {
                        setEditing(space);
                      }}
                      className="rounded border px-3 py-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${space.name}`}
                      onClick={() => {
                        remove.mutate(space.id);
                      }}
                      className="rounded border px-3 py-1"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
