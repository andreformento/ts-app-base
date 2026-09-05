import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    include: ['test/e2e/**/*.e2e-spec.ts'],
    environment: 'node',
    testTimeout: 120_000,
    hookTimeout: 300_000,
    globalSetup: ['./test/e2e/global-setup.ts'],
    setupFiles: ['./test/reflect.ts'],
  },
});
