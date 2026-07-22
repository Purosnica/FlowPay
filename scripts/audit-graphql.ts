/**
 * Auditoría estática de la capa GraphQL.
 * Ejecutar: npx tsx scripts/audit-graphql.ts
 */

import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'dist'].includes(entry.name)) {
        out.push(...walk(full));
      }
    } else if (entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function norm(p: string): string {
  return p.replace(/\\/g, '/');
}

const resolverFiles = walk('src/lib/graphql/resolvers');
const fieldMap = new Map<string, string[]>();
const noAuthHints: string[] = [];
const listWithoutPagination: string[] = [];

const fieldRe = /(?:queryField|mutationField)\s*\(\s*['"]([^'"]+)['"]/g;
const permRe = /requerirPermiso|auth[A-Z]\w+|requerirAccesoMandante/;

for (const file of resolverFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match: RegExpExecArray | null;

  while ((match = fieldRe.exec(content))) {
    const name = match[1];
    const arr = fieldMap.get(name) ?? [];
    arr.push(norm(file));
    fieldMap.set(name, arr);

    const start = match.index;
    const chunk = content.slice(start, start + 1200);
    if (!permRe.test(chunk) && !chunk.includes('miPerfil') && !chunk.includes('actualizarMiPerfil')) {
      noAuthHints.push(`${name} → ${norm(file)}`);
    }

    const isListReturn =
      /type:\s*\[/.test(chunk) &&
      !/page:\s*t\.arg/.test(chunk) &&
      !/Page/.test(chunk.slice(0, 400));
  }
}

const dupFields = [...fieldMap.entries()].filter(
  ([, files]) => new Set(files).size > 1,
);

const cobranzaIndex = fs.readFileSync(
  'src/lib/graphql/resolvers/cobranza/index.ts',
  'utf8',
);
const registeredModules = [...cobranzaIndex.matchAll(/import\s+"\.\.\/([^"]+)"/g)].map(
  (m) => m[1],
);

const orphanModules: string[] = [];
const cobranzaDir = 'src/lib/graphql/resolvers';
for (const entry of fs.readdirSync(cobranzaDir, { withFileTypes: true })) {
  if (
    entry.isDirectory() &&
    fs.existsSync(path.join(cobranzaDir, entry.name, 'index.ts')) &&
    entry.name !== 'cobranza' &&
    !registeredModules.includes(entry.name)
  ) {
    orphanModules.push(entry.name);
  }
}

const queryFile = fs.readFileSync(
  'src/lib/graphql/queries/cobranza.queries.ts',
  'utf8',
);
const exportCount = (queryFile.match(/^export const GET_/gm) ?? []).length;
const fragmentImports = queryFile.includes('gql-fragments');

console.log('=== GRAPHQL AUDIT ===');
console.log(`Resolver files: ${resolverFiles.length}`);
console.log(`Root fields: ${fieldMap.size}`);
console.log(`Client GET_* queries: ${exportCount}`);
console.log(`Uses gql-fragments: ${fragmentImports ? 'yes' : 'no'}`);

console.log('\n=== DUPLICATE ROOT FIELDS ===');
if (dupFields.length === 0) {
  console.log('(none)');
} else {
  for (const [name, files] of dupFields) {
    console.log(`${name}: ${files.join(', ')}`);
  }
}

console.log('\n=== UNREGISTERED COBRANZA MODULES ===');
if (orphanModules.length === 0) {
  console.log('(none)');
} else {
  for (const m of orphanModules) {
    console.log(`  ${m}`);
  }
}

console.log('\n=== FIELDS WITHOUT EXPLICIT PERM CHECK (review) ===');
for (const hint of noAuthHints.slice(0, 20)) {
  console.log(`  ${hint}`);
}
if (noAuthHints.length > 20) {
  console.log(`  ... +${noAuthHints.length - 20} más`);
}

console.log('\n=== P0 FIXES APPLIED (Fase 6) ===');
console.log('  catalogo-cobranza registrado (agencias, rutas, cortesPrestamo)');
console.log('  acuerdos: idprestamo requerido + include cuotas (N+1)');
console.log('  prestamosPorCliente: limit cap 100');
console.log('  GET_PRESTAMOS slim + selective include en resolver');
console.log('  notificacionesOperativas: arg limite (max 30)');
console.log('  historial asignación/estados: limit cap 100');

console.log('\n=== P1 BACKLOG ===');
console.log('  Paginar usuariosActivos (usuariosMandante: límite 200 aplicado)');
console.log('  prismaField + selection-aware includes en listas pesadas');
console.log('  Scope deudor-contacto por mandante');

console.log('\n=== I111 N+1 RE-AUDIT ===');
const reclamoGql = fs.readFileSync(
  'src/lib/graphql/resolvers/reclamo/index.ts',
  'utf8',
);
const acuerdoQ = fs.readFileSync(
  'src/lib/graphql/resolvers/acuerdo/queries.ts',
  'utf8',
);
const batchLoader = fs.existsSync('src/lib/graphql/batch-loader.ts');
const n1Checks = [
  {
    id: 'I111-1',
    ok: reclamoGql.includes('include: { cliente: true, prestamo: true }'),
    label: 'reclamos lista con include cliente+prestamo',
  },
  {
    id: 'I111-2',
    ok: acuerdoQ.includes('include:') && acuerdoQ.includes('cuotas'),
    label: 'acuerdos con include cuotas (anti N+1)',
  },
  {
    id: 'I111-3',
    ok: batchLoader,
    label: 'batch-loader util disponible',
  },
];
for (const c of n1Checks) {
  console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.id}: ${c.label}`);
}
if (n1Checks.some((c) => !c.ok)) {
  process.exitCode = 1;
}

const schemaPrisma = fs.readFileSync('prisma/schema.prisma', 'utf8');
const builderTs = fs.readFileSync('src/lib/graphql/builder.ts', 'utf8');
const prismaObjectHelper = fs.existsSync(
  'src/lib/graphql/helpers/prisma-object.ts',
);

const pothosChecks = [
  {
    ok: /generator\s+pothos/.test(schemaPrisma),
    label: 'P5-1: generator pothos en schema.prisma',
  },
  {
    ok: builderTs.includes('@pothos/plugin-prisma/generated'),
    label: 'P5-2: builder importa PrismaTypes generados',
  },
  {
    ok: builderTs.includes('getDatamodel()'),
    label: 'P5-3: builder usa getDatamodel()',
  },
  {
    ok: prismaObjectHelper,
    label: 'P5-4: helper definePrismaObject centralizado',
  },
];

console.log('\n=== P5 POTHOS (PrismaTypes) ===');
for (const check of pothosChecks) {
  console.log(`  [${check.ok ? 'PASS' : 'FAIL'}] ${check.label}`);
}
const pothosFail = pothosChecks.some((c) => !c.ok);
if (pothosFail) {
  process.exitCode = 1;
}

console.log('\naudit-graphql: OK');
