import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const decorators = swc.vite() as never;

export default defineConfig({
  plugins: [decorators],
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    setupFiles: ['./test/reflect.ts'],
  },
});
