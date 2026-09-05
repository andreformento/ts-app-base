import { startStack } from './stack';
import type { Stack } from './stack';

declare global {
  var __stack__: Stack | undefined;
}

export default async function globalSetup(): Promise<void> {
  globalThis.__stack__ = await startStack();
}
