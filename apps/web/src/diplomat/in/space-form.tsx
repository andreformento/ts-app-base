import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { Space } from '../../model/space.js';
import { asApiFailure, fieldFor } from '../../logic/space.js';
import { SpaceFormValues } from '../../wire/out/space-request.js';
import { useCreateSpace, useUpdateSpace } from '../../application/space.js';

export function SpaceForm({
  editing,
  onDone,
}: {
  editing: Space | null;
  onDone: () => void;
}) {
  const create = useCreateSpace();
  const update = useUpdateSpace();
  const pending = create.isPending || update.isPending;

  const form = useForm<SpaceFormValues>({
    resolver: zodResolver(SpaceFormValues),
    defaultValues: {
      name: editing?.name ?? '',
      description: editing?.description ?? '',
    },
  });

  const { reset, setError } = form;

  const onSubmit = form.handleSubmit(async (values) => {
    const { name, description } = values;
    const draft = {
      name,
      description: description === '' ? null : description,
    };
    try {
      if (editing === null) await create.mutateAsync(draft);
      else await update.mutateAsync({ id: editing.id, patch: draft });
      reset({ name: '', description: '' });
      onDone();
    } catch (error) {
      const failure = asApiFailure(error);
      if (failure === null) {
        setError('root', { message: 'Something went wrong.' });
        return;
      }
      const field = fieldFor(failure.code);
      if (field !== null) setError(field, { message: failure.message });
      else setError('root', { message: failure.message });
    }
  });

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-4"
      noValidate
    >
      <h2 className="text-lg font-semibold">
        {editing === null ? 'New space' : `Edit ${editing.name}`}
      </h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          className="rounded border border-neutral-300 px-3 py-2"
          aria-invalid={form.formState.errors.name !== undefined}
          aria-describedby={
            form.formState.errors.name === undefined ? undefined : 'name-error'
          }
          {...form.register('name')}
        />
        {form.formState.errors.name !== undefined && (
          <p id="name-error" role="alert" className="text-sm text-red-700">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          className="rounded border border-neutral-300 px-3 py-2"
          aria-invalid={form.formState.errors.description !== undefined}
          aria-describedby={
            form.formState.errors.description === undefined
              ? undefined
              : 'description-error'
          }
          {...form.register('description')}
        />
        {form.formState.errors.description !== undefined && (
          <p
            id="description-error"
            role="alert"
            className="text-sm text-red-700"
          >
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      {form.formState.errors.root !== undefined && (
        <p role="alert" className="text-sm text-red-700">
          {form.formState.errors.root.message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {editing === null ? 'Create space' : 'Save changes'}
        </button>
        {editing !== null && (
          <button
            type="button"
            onClick={onDone}
            className="rounded border px-4 py-2"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
