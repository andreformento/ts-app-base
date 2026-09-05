import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useForm } from 'react-hook-form';
import { Field } from '../../components/ui/Field';
import { SpaceFormDto } from './space-form.dto';
import { useCreateSpace, useUpdateSpace } from './use-spaces';
import type { Space } from '../../types/space';

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

  const form = useForm<SpaceFormDto>({
    resolver: classValidatorResolver(SpaceFormDto),
    defaultValues: {
      name: editing?.name ?? '',
      description: editing?.description ?? '',
    },
  });

  const submit = form.handleSubmit(async (values) => {
    const { name, description } = values;
    const input = {
      name,
      description: description === '' ? null : description,
    };
    try {
      if (editing === null) await create.mutateAsync(input);
      else await update.mutateAsync({ id: editing.id, input });
      form.reset({ name: '', description: '' });
      onDone();
    } catch (error) {
      form.setError('root', {
        message:
          error instanceof Error ? error.message : 'Something went wrong.',
      });
    }
  });

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4"
      noValidate
    >
      <h2 className="text-lg font-semibold">
        {editing === null ? 'New space' : `Edit ${editing.name}`}
      </h2>

      <Field label="Name" error={form.formState.errors.name?.message}>
        {(props) => <input {...props} {...form.register('name')} />}
      </Field>

      <Field
        label="Description"
        error={form.formState.errors.description?.message}
      >
        {(props) => (
          <textarea rows={3} {...props} {...form.register('description')} />
        )}
      </Field>

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
