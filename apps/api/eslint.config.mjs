// @ts-check
import eslint from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'eslint.config.mjs',
      'vitest*.config.ts',
      'prisma.config.ts',
      'scripts/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  prettier,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // docs/DECISIONS.md - escapes are banned, not warned.
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
      // docs/STRUCTURE.md - process.env is read in exactly one file per app.
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Read env only in src/config.ts; import the typed config elsewhere.',
        },
      ],
    },
  },
  // The import matrix from docs/ARCHITECTURE.md, enforced.
  {
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['src/**/*.ts'],
      'boundaries/ignore': ['src/**/*.spec.ts'],
      // NodeNext '.js' specifiers must resolve back to their '.ts' source,
      // otherwise the element-types rule silently matches nothing.
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
      'boundaries/elements': [
        { type: 'main', pattern: 'src/main.ts', mode: 'file' },
        // Wiring constructs the graph, so it alone may reach across layers.
        {
          type: 'wiring',
          pattern: 'src/diplomat/in/app.module.ts',
          mode: 'file',
        },
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
            // A layer may always import itself; the matrix governs CROSSING layers.
            { from: 'model', allow: ['model'] },
            { from: 'logic', allow: ['logic', 'model'] },
            { from: 'wire', allow: ['wire'] },
            { from: 'adapter', allow: ['adapter', 'model', 'wire'] },
            {
              from: 'application',
              allow: [
                'application',
                'model',
                'logic',
                'diplomat-out',
                'config',
              ],
            },
            {
              from: 'diplomat-in',
              allow: [
                'diplomat-in',
                'model',
                'wire',
                'adapter',
                'application',
                'config',
              ],
            },
            {
              from: 'diplomat-out',
              allow: ['diplomat-out', 'model', 'wire', 'adapter', 'config'],
            },
            { from: 'wiring', allow: ['*'] },
            { from: 'main', allow: ['wiring', 'diplomat-in', 'model'] },
          ],
        },
      ],
      'boundaries/external': [
        'error',
        {
          default: 'allow',
          rules: [
            // model has ZERO imports - not even zod.
            {
              from: ['model'],
              disallow: ['*'],
              message:
                'model/ must have zero imports. See docs/ARCHITECTURE.md.',
            },
            // logic is pure: nothing but model.
            {
              from: ['logic'],
              disallow: ['*'],
              message: 'logic/ must be pure and import only model/.',
            },
            // The pure core stays framework-free. application/ and diplomat/ may
            // use Nest for construction and lifecycle. See docs/ARCHITECTURE.md.
            {
              from: ['model', 'logic', 'wire', 'adapter'],
              disallow: ['@nestjs/*', '@nestjs*'],
              message:
                'NestJS may not enter the pure layers (model, logic, wire, adapter).',
            },
            // Prisma never leaves diplomat/out and adapter.
            {
              from: ['model', 'logic', 'wire', 'application', 'diplomat-in'],
              disallow: ['@prisma/*', 'prisma'],
              message: 'Prisma is confined to diplomat/out and adapter.',
            },
            // Unit tests import their runner; that is not a layer violation.
            { from: ['logic', 'adapter'], allow: ['vitest'] },
          ],
        },
      ],
    },
  },
  {
    files: ['test/**/*.ts', '**/*.spec.ts'],
    rules: {
      'no-restricted-properties': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
