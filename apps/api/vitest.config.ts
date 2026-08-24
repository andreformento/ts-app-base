import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/{logic,adapter}/**/*.spec.ts'],
    environment: 'node',
  },
});
