import { useId } from 'react';
import type { ReactNode } from 'react';

type ControlProps = {
  id: string;
  className: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
};

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        className: 'rounded border border-neutral-300 px-3 py-2',
        'aria-invalid': error !== undefined,
        'aria-describedby': error === undefined ? undefined : errorId,
      })}
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
