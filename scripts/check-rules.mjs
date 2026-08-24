import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const require = createRequire(resolve('apps/api/node_modules/'));
const ts = require('typescript');

const ROOT = process.cwd();
const APPS = ['apps/api/src', 'apps/web/src'];
const DIRECTIVE = /eslint-disable|ts-expect-error|prettier-ignore/;

const FORBIDDEN_NAMES = /\.(controller|service|repository|dto|entity)\.tsx?$/;
const MOCKING =
  /\b(vi|jest)\.(mock|fn|spyOn|doMock|mocked)\b|\bsinon\b|\bproxyquire\b/;

const TYPE_ALLOWLIST = new Set(['apps/api/src/diplomat/in/auth.guard.ts']);

const failures = [];

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}

function sources(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...sources(path));
    else if (/\.tsx?$/.test(entry)) found.push(path);
  }
  return found;
}

function commentsIn(text) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.JSX,
    text,
  );
  const found = [];
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    const isComment =
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia;
    if (isComment) {
      const body = text.slice(scanner.getTokenStart(), scanner.getTokenEnd());
      if (!DIRECTIVE.test(body)) {
        found.push({
          line: text.slice(0, scanner.getTokenStart()).split('\n').length,
          body,
        });
      }
    }
    token = scanner.scan();
  }
  return found;
}

function declaresTypes(text) {
  const source = ts.createSourceFile(
    'x.ts',
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const declared = [];
  source.forEachChild((node) => {
    if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node))
      declared.push(node.name.text);
  });
  return declared;
}

for (const app of APPS) {
  const dir = resolve(ROOT, app);
  for (const path of sources(dir)) {
    const file = relative(ROOT, path);
    const text = readFileSync(path, 'utf8');

    for (const comment of commentsIn(text)) {
      fail(
        file,
        `line ${String(comment.line)}: code carries no comments (docs/ carries the rationale)`,
      );
    }

    if (FORBIDDEN_NAMES.test(file)) {
      fail(file, 'filename belongs to a layering this project does not use');
    }

    if (MOCKING.test(text)) {
      fail(file, 'mocking is prohibited in every tier');
    }

    const inTypeHome = /\/(model|wire)\//.test(file);
    if (
      !inTypeHome &&
      !file.endsWith('.spec.ts') &&
      !TYPE_ALLOWLIST.has(file)
    ) {
      const declared = declaresTypes(text);
      if (declared.length > 0) {
        fail(file, `declares ${declared.join(', ')} outside model/ and wire/`);
      }
    }
  }

  for (const path of sources(dir)) {
    const file = relative(ROOT, path);
    if (!/\/(logic|adapter)\//.test(file) || file.endsWith('.spec.ts'))
      continue;
    const spec = path.replace(/\.tsx?$/, '.spec.ts');
    try {
      statSync(spec);
    } catch {
      fail(file, 'pure layers require a sibling .spec.ts');
    }
  }
}

if (failures.length > 0) {
  console.error('Project rules violated:\n');
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(
    `\n${String(failures.length)} violation(s). See CLAUDE.md and docs/.`,
  );
  process.exit(1);
}

console.log(
  'Project rules upheld: no comments, no mocks, types in model/wire, pure layers tested.',
);
