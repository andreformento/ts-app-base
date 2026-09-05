import type { TransformFnParams } from 'class-transformer';

export function trimmed({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function blankToNull({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
}
