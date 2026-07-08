/**
 * Auditoría estática de documentación oficial (Fase 13).
 * Ejecutar: npm run audit:docs
 */

import * as fs from 'fs';

interface Check {
  id: string;
  label: string;
  ok: boolean;
}

const checks: Check[] = [];

function check(id: string, label: string, ok: boolean): void {
  checks.push({ id, label, ok });
}

function exists(path: string): boolean {
  return fs.existsSync(path);
}

function read(path: string): string {
  return exists(path) ? fs.readFileSync(path, 'utf8') : '';
}

const requiredDocs = [
  { id: 'D-3', label: 'Manual funcional', path: 'docs/manuales/MANUAL-FUNCIONAL.md' },
  { id: 'D-4', label: 'Manual administrador', path: 'docs/manuales/MANUAL-ADMINISTRADOR.md' },
  { id: 'D-5', label: 'Manual supervisor', path: 'docs/manuales/MANUAL-SUPERVISOR.md' },
  { id: 'D-6', label: 'Manual cobrador', path: 'docs/manuales/MANUAL-COBRADOR.md' },
  { id: 'D-7', label: 'Manual mandante', path: 'docs/manuales/MANUAL-MANDANTE.md' },
  {
    id: 'D-8',
    label: 'Catálogo KPIs',
    path: 'docs/catalogos/CATALOGO-KPIs.md',
  },
  {
    id: 'D-9',
    label: 'Catálogo permisos',
    path: 'docs/catalogos/CATALOGO-PERMISOS.md',
  },
  {
    id: 'D-10',
    label: 'Catálogo reglas de negocio',
    path: 'docs/catalogos/CATALOGO-REGLAS-NEGOCIO.md',
  },
  {
    id: 'D-11',
    label: 'Catálogo procesos',
    path: 'docs/catalogos/CATALOGO-PROCESOS.md',
  },
  { id: 'D-12', label: 'Roadmap', path: 'docs/ROADMAP.md' },
  { id: 'D-13', label: 'Release notes', path: 'docs/RELEASE-NOTES.md' },
  {
    id: 'D-14',
    label: 'Matriz trazabilidad',
    path: 'docs/MATRIZ-TRAZABILIDAD.md',
  },
];

const docsIndex = read('docs/README.md');
const rootReadme = read('README.md');
const releaseNotes = read('docs/RELEASE-NOTES.md');

check('D-1', 'Índice docs/README.md', docsIndex.length > 0);
check('D-2', 'README.md raíz', rootReadme.length > 0);

for (const doc of requiredDocs) {
  const content = read(doc.path);
  check(doc.id, doc.label, content.length > 200);
}

check(
  'D-15',
  'Índice enlaza manuales y catálogos',
  docsIndex.includes('manuales/') && docsIndex.includes('catalogos/'),
);

const pkg = JSON.parse(read('package.json')) as { version?: string };
const version = pkg.version ?? '';
check(
  'D-16',
  'Release notes alineadas con package.json',
  version.length > 0 && releaseNotes.includes(`v${version}`),
);

check(
  'D-17',
  'Matriz referencia qa:gate',
  read('docs/MATRIZ-TRAZABILIDAD.md').includes('qa:gate'),
);

check(
  'D-18',
  'Catálogo permisos referencia fuente canónica',
  read('docs/catalogos/CATALOGO-PERMISOS.md').includes('permiso-codes.ts'),
);

console.log('=== DOCS AUDIT ===');
const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.id}: ${c.label}`);
}
console.log('');
console.log(
  `Total: ${checks.length} | Pass: ${checks.length - failed.length} | Fail: ${failed.length}`,
);
if (failed.length > 0) {
  process.exit(1);
}
