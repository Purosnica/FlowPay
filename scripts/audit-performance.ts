/**
 * Auditoría estática de rendimiento FlowPay.
 * Ejecutar: npx tsx scripts/audit-performance.ts
 */

import * as fs from 'fs';

interface CheckResult {
  id: string;
  label: string;
  ok: boolean;
}

const checks: CheckResult[] = [];

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

function check(id: string, label: string, ok: boolean): void {
  checks.push({ id, label, ok });
}

const limits = read('src/lib/cobranza/performance-limits.ts');
const bandeja = read('src/lib/cobranza/bandeja-cobrador-service.ts');
const miDia = read('src/lib/cobranza/mi-dia-service.ts');
const secuencia = read('src/lib/cobranza/secuencia-contacto-service.ts');
const reporte = read('src/lib/cobranza/reporte-cobranza-service.ts');
const prestamoGql = read('src/lib/graphql/resolvers/prestamo/queries.ts');
const gestionGql = read('src/lib/graphql/resolvers/gestion/queries.ts');
const clienteGql = read('src/lib/graphql/resolvers/cliente/queries.ts');
const usuarioGql = read('src/lib/graphql/resolvers/usuario/queries.ts');
const schema = read('prisma/schema.prisma');
const reportesPage = read('src/app/(dashboard)/cobranza/reportes/page.tsx');
const centroPage = read(
  'src/app/(dashboard)/cobranza/centro-inteligencia/page.tsx',
);
const equipoPage = read('src/app/(dashboard)/cobranza/equipo/page.tsx');
const dataTable = read('src/components/cobranza/data-table.tsx');

check(
  'P0-1',
  'Bandeja limita candidatos antes de prioridad',
  bandeja.includes('BANDEJA_PRIORIDAD_CANDIDATE_LIMIT') &&
    bandeja.includes('take: BANDEJA_PRIORIDAD_CANDIDATE_LIMIT'),
);

check(
  'P0-2',
  'Mi día limita candidatos antes de prioridad',
  miDia.includes('MI_DIA_PRIORIDAD_CANDIDATE_LIMIT') &&
    miDia.includes('take: MI_DIA_PRIORIDAD_CANDIDATE_LIMIT'),
);

check(
  'P0-3',
  'Secuencia contacto batch por campañas',
  secuencia.includes('idcampana: { in: idcampanas }') &&
    secuencia.includes('prestamosPorCampana'),
);

check(
  'P0-4',
  'Reporte cobranza usa aggregate en lugar de findMany préstamos',
  reporte.includes('tbl_prestamo.aggregate') &&
    !reporte.includes('prestamos.reduce'),
);

check(
  'P0-5',
  'Reporte cobranza una sola query de pagos',
  (reporte.match(/tbl_pago\.findMany/g) ?? []).length === 1,
);

check(
  'P1-1',
  'prestamos GraphQL usa resolvePagination',
  prestamoGql.includes('resolvePagination') &&
    prestamoGql.includes('buildPaginationMeta'),
);

check(
  'P1-2',
  'gestiones GraphQL usa resolvePagination',
  gestionGql.includes('resolvePagination'),
);

check(
  'P1-3',
  'clientes GraphQL usa resolvePagination',
  clienteGql.includes('resolvePagination'),
);

check(
  'P1-4',
  'usuariosActivos con límite',
  usuarioGql.includes('LISTA_USUARIOS_ACTIVOS_LIMIT'),
);

check(
  'P1-5',
  'timelinePrestamo con límite máximo',
  prestamoGql.includes('TIMELINE_PRESTAMO_LIMITE_MAX'),
);

check(
  'P1-6',
  'Índice gestión fechaProximaGestion',
  schema.includes('@@index([idgestor, fechaProximaGestion, deletedAt])'),
);

check(
  'P1-7',
  'Índice pago compuesto mandante/fecha',
  schema.includes('@@index([idmandante, deletedAt, aplicado, fechaPago])'),
);

check(
  'P1-8',
  'Reportes page queries con enabled',
  reportesPage.includes('enabled: mandanteId > 0'),
);

check(
  'P1-9',
  'Centro inteligencia charts diferidos',
  centroPage.includes('chartsEnabled'),
);

check(
  'P1-10',
  'Equipo supervisor query condicional',
  equipoPage.includes('enabled: !esGerente'),
);

check(
  'P1-11',
  'DataTable memoizado',
  dataTable.includes('memo(DataTableInner)'),
);

check('POS-1', 'performance-limits.ts existe', limits.includes('export const'));

console.log('=== PERFORMANCE AUDIT ===');
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
