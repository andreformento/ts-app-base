import { stopStack } from './stack';

export default async function globalTeardown(): Promise<void> {
  const stack = globalThis.__stack__;
  if (stack !== undefined) await stopStack(stack);
}
