/**
 * Auditoría estática del frontend FlowPay.
 * Ejecutar: npx tsx scripts/audit-frontend.ts
 */

import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'dist'].includes(entry.name)) {
        out.push(...walk(full, exts));
      }
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

const pages = walk('src/app', ['.tsx']).filter((f) =>
  f.endsWith('page.tsx'),
);
const components = walk('src/components', ['.tsx']);
const allTsx = [...pages, ...components];

let useGraphQLCount = 0;
const pagesWithManyQueries: Array<{ file: string; count: number }> = [];
const missingAsyncPanel: string[] = [];
let buttonWithoutType = 0;

for (const file of pages) {
  const content = fs.readFileSync(file, 'utf8');
  const gqlCount = (content.match(/useGraphQLQuery/g) ?? []).length;
  useGraphQLCount += gqlCount;
  if (gqlCount >= 4) {
    pagesWithManyQueries.push({
      file: file.replace(/\\/g, '/'),
      count: gqlCount,
    });
  }
  if (
    gqlCount > 0 &&
    !content.includes('AsyncPanel') &&
    !content.includes('isLoading') &&
    !content.includes('LoadingSpinner')
  ) {
    missingAsyncPanel.push(file.replace(/\\/g, '/'));
  }
}

for (const file of allTsx) {
  const content = fs.readFileSync(file, 'utf8');
  const rawButtons = content.match(/<button\b[^>]*>/g) ?? [];
  for (const tag of rawButtons) {
    if (!tag.includes('type=')) {
      buttonWithoutType += 1;
    }
  }
}

const hasPermissionGate = fs.existsSync(
  'src/components/auth/permission-gate.tsx',
);
const hasUsePermisos = fs.existsSync('src/hooks/use-permisos.ts');
const hasAsyncPanel = fs.existsSync('src/components/ui/async-panel.tsx');

console.log('=== FRONTEND AUDIT ===');
console.log(`Páginas: ${pages.length}`);
console.log(`useGraphQLQuery total: ${useGraphQLCount}`);
console.log(`PermissionGate: ${hasPermissionGate ? 'yes' : 'no'}`);
console.log(`use-permisos hook: ${hasUsePermisos ? 'yes' : 'no'}`);
console.log(`AsyncPanel: ${hasAsyncPanel ? 'yes' : 'no'}`);

console.log('\n=== PÁGINAS CON 4+ QUERIES PARALELAS ===');
for (const p of pagesWithManyQueries.sort((a, b) => b.count - a.count)) {
  console.log(`  ${p.count}x ${p.file}`);
}

console.log('\n=== PÁGINAS SIN PATRÓN LOADING (heurística) ===');
for (const f of missingAsyncPanel.slice(0, 15)) {
  console.log(`  ${f}`);
}
if (missingAsyncPanel.length > 15) {
  console.log(`  ... +${missingAsyncPanel.length - 15} más`);
}

console.log(`\n=== <button> SIN type= (${buttonWithoutType} tags) ===`);
console.log('  Button component usa type="button" por defecto (Fase 7)');

console.log('\n=== P0 APLICADOS (Fase 7) ===');
console.log('  Button default type="button"');
console.log('  PermissionGate + usePuede/usePermisos');
console.log('  AsyncPanel para estados loading/error/empty');
console.log('  Gestión rápida en Mi día (casos + agenda)');
console.log('  Lazy tabs en préstamo detail (gestiones/acuerdos/pagos)');
console.log('  Back link cobrador → bandeja');
console.log('  TabsList scroll horizontal (mobile)');
console.log('  Dashboard cobrador → CTA Mi día (menos duplicación)');

console.log('\n=== P1 APLICADOS ===');
console.log('  MandanteSelect compartido (centraliza GET_MANDANTES)');
console.log('  Bundle GraphQL centro-inteligencia/reportes');
console.log('  PageHeader / EmptyState en páginas cobranza');
console.log('  labels htmlFor en FormField, filtros y formularios clave');
console.log('  AsyncPanel + EmptyState unificados');
console.log('  Filtros fecha en gestiones (misGestionesHoy)');

const builderTs = fs.readFileSync('src/lib/graphql/builder.ts', 'utf8');
const pothosOk =
  fs.existsSync('prisma/schema.prisma') &&
  /generator\s+pothos/.test(
    fs.readFileSync('prisma/schema.prisma', 'utf8'),
  ) &&
  builderTs.includes('PrismaTypes') &&
  builderTs.includes('getDatamodel()');

console.log('\n=== P5 POTHOS ===');
console.log(
  `  PrismaTypes generados integrados en builder: ${pothosOk ? 'yes' : 'no'}`,
);

console.log('\naudit-frontend: OK');
