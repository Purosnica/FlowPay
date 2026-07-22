/**
 * Escanea src/lib/graphql/queries y genera allowlist de operationName.
 * Ejecutar: npm run graphql:persisted
 */

import * as fs from 'fs';
import * as path from 'path';

const QUERIES_DIR = path.join('src', 'lib', 'graphql', 'queries');
const OUT_FILE = path.join(
  'src',
  'lib',
  'graphql',
  'persisted-operations.generated.ts',
);

const OP_RE = /\b(?:query|mutation)\s+([A-Za-z_][A-Za-z0-9_]*)/g;

function main(): void {
  const names = new Set<string>();
  const files = fs
    .readdirSync(QUERIES_DIR)
    .filter((f) => f.endsWith('.ts') && !f.includes('fragment'));

  for (const file of files) {
    const text = fs.readFileSync(path.join(QUERIES_DIR, file), 'utf8');
    for (const match of text.matchAll(OP_RE)) {
      names.add(match[1]);
    }
  }

  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  const body = [
    '/**',
    ' * Generado por scripts/generate-persisted-operations.ts',
    ' * No editar a mano: npm run graphql:persisted',
    ' */',
    '',
    'export const PERSISTED_OPERATION_NAMES = [',
    ...sorted.map((n) => `  '${n}',`),
    '] as const;',
    '',
    'export type PersistedOperationName =',
    '  (typeof PERSISTED_OPERATION_NAMES)[number];',
    '',
  ].join('\n');

  fs.writeFileSync(OUT_FILE, body, 'utf8');
  process.stderr.write(
    `Wrote ${sorted.length} operations → ${OUT_FILE}\n`,
  );
}

main();
