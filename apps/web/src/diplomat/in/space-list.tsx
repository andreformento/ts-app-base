import { useState } from 'react';
import type { Space } from '../../model/space.js';
import { canManage } from '../../logic/space.js';
import { useDeleteSpace, useSpaces } from '../../application/space.js';
import { SpaceForm } from './space-form.js';

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
                  <p className="text-xs text-neutral-500">{space.role}</p>
                </div>
                {canManage(space) && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(space);
                      }}
                      aria-label={`Edit ${space.name}`}
                      className="rounded border px-3 py-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        remove.mutate(space.id);
                      }}
                      aria-label={`Delete ${space.name}`}
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
