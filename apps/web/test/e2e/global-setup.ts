import { startStack, type Stack } from './stack.js';

declare global {
  var __stack__: Stack | undefined;
}

export default async function globalSetup(): Promise<void> {
  globalThis.__stack__ = await startStack();
}
