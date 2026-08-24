import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const cases = [
  {
    file: 'src/model/__boundary__.ts',
    source: "import { z } from 'zod';\nexport const bad = z.string();\n",
    expect: 'model/ must have zero imports',
  },
  {
    file: 'src/logic/__boundary__.ts',
    source:
      "import { toSpace } from '../adapter/in/space-row.js';\nexport const bad = toSpace;\n",
    expect: 'Layer "logic" may not import "adapter"',
  },
  {
    file: 'src/application/__boundary__.ts',
    source:
      "import { SpaceResponse } from '../wire/out/space-response.js';\nexport const bad = SpaceResponse;\n",
    expect: 'Layer "application" may not import "wire"',
  },
  {
    file: 'src/diplomat/out/__boundary__.ts',
    source:
      "import { create } from '../../application/space.js';\nexport const bad = create;\n",
    expect: 'Layer "diplomat-out" may not import "application"',
  },
  {
    file: 'src/adapter/in/__boundary_nest__.ts',
    source:
      "import { Injectable } from '@nestjs/common';\nexport const bad = Injectable;\n",
    expect: 'NestJS may not enter the pure layers',
  },
  {
    file: 'src/application/__boundary_prisma__.ts',
    source:
      "import { PrismaClient } from '@prisma/client';\nexport const bad = PrismaClient;\n",
    expect: 'Prisma is confined to diplomat/out and adapter',
  },
];

for (const testCase of cases) {
  const path = resolve(root, testCase.file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, testCase.source);
}

let output = '';
try {
  execFileSync('npx', ['eslint', ...cases.map((c) => c.file)], {
    cwd: root,
    encoding: 'utf8',
  });
} catch (error) {
  output = String(error.stdout ?? '');
} finally {
  for (const testCase of cases)
    rmSync(resolve(root, testCase.file), { force: true });
}

const missed = cases.filter((c) => !output.includes(c.expect));
if (missed.length > 0) {
  console.error(
    'Import matrix NOT enforced. These violations went unreported:',
  );
  for (const testCase of missed)
    console.error(`  ${testCase.file}: expected "${testCase.expect}"`);
  process.exit(1);
}

console.log(
  `Import matrix enforced: ${String(cases.length)} violations correctly rejected.`,
);
