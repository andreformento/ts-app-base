// @ts-check
import eslint from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'eslint.config.mjs',
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
      'test/e2e/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  prettier,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  // The same import matrix as the api. See docs/ARCHITECTURE.md § Frontend.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['src/**/*.{ts,tsx}'],
      'boundaries/ignore': ['src/**/*.spec.{ts,tsx}'],
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/elements': [
        { type: 'main', pattern: 'src/main.tsx', mode: 'file' },
        { type: 'model', pattern: 'src/model/**/*', mode: 'file' },
        { type: 'logic', pattern: 'src/logic/**/*', mode: 'file' },
        { type: 'wire', pattern: 'src/wire/**/*', mode: 'file' },
        { type: 'adapter', pattern: 'src/adapter/**/*', mode: 'file' },
        { type: 'application', pattern: 'src/application/**/*', mode: 'file' },
        { type: 'diplomat-in', pattern: 'src/diplomat/in/**/*', mode: 'file' },
        {
          type: 'diplomat-out',
          pattern: 'src/diplomat/out/**/*',
          mode: 'file',
        },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message:
            'Layer "${file.type}" may not import "${dependency.type}". See docs/ARCHITECTURE.md.',
          rules: [
            { from: 'model', allow: ['model'] },
            { from: 'logic', allow: ['logic', 'model'] },
            { from: 'wire', allow: ['wire'] },
            { from: 'adapter', allow: ['adapter', 'model', 'wire'] },
            {
              from: 'application',
              allow: ['application', 'model', 'logic', 'diplomat-out'],
            },
            {
              from: 'diplomat-in',
              allow: [
                'diplomat-in',
                'model',
                'logic',
                'wire',
                'adapter',
                'application',
              ],
            },
            {
              from: 'diplomat-out',
              allow: ['diplomat-out', 'model', 'wire', 'adapter'],
            },
            { from: 'main', allow: ['diplomat-in', 'application'] },
          ],
        },
      ],
      'boundaries/external': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: ['model'],
              disallow: ['*'],
              message:
                'model/ must have zero imports. See docs/ARCHITECTURE.md.',
            },
            {
              from: ['logic'],
              disallow: ['*'],
              message: 'logic/ must be pure and import only model/.',
            },
            { from: ['logic', 'adapter'], allow: ['vitest', 'zod'] },
            {
              from: ['model', 'logic', 'application', 'diplomat-out'],
              disallow: ['react', 'react-dom', 'react/*'],
              message:
                'React belongs in diplomat/in. Components are the driving adapter.',
            },
          ],
        },
      ],
    },
  },
);
