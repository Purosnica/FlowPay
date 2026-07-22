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
    (bandeja.includes('take: BANDEJA_PRIORIDAD_CANDIDATE_LIMIT') ||
      bandeja.includes('candidateLimit')),
);

check(
  'P0-2',
  'Mi día limita candidatos antes de prioridad',
  miDia.includes('MI_DIA_PRIORIDAD_CANDIDATE_LIMIT') &&
    (miDia.includes('take: MI_DIA_PRIORIDAD_CANDIDATE_LIMIT') ||
      miDia.includes('candidateLimit')),
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

// I105–I119
const kpiCache = fs.existsSync('src/lib/cache/kpi-cache.ts')
  ? read('src/lib/cache/kpi-cache.ts')
  : '';
const dashboardSvc = read('src/lib/cobranza/dashboard-service.ts');
const nextCfg = read('next.config.mjs');
const gqlRoute = read('src/app/api/graphql/route.ts');
const lazyChart = fs.existsSync('src/components/charts/lazy-apex-chart.tsx');
const dataTableNow = read('src/components/cobranza/data-table.tsx');
const importJob = read('src/lib/cobranza/import/importacion-job-service.ts');
const instrumentation = fs.existsSync('src/instrumentation.ts');
const resumenSvc = fs.existsSync('src/lib/cobranza/resumen-diario-service.ts');
const exportJob = fs.existsSync('src/lib/cobranza/exportacion-job-service.ts');
const tipifApi = fs.existsSync('src/app/api/catalogos/tipificaciones/route.ts');
const moraProfile = fs.existsSync('src/lib/cobranza/mora-recalculo-profile.ts');
const metricsPlugin = fs.existsSync(
  'src/lib/graphql/plugins/operation-metrics.ts',
);

check(
  'I105',
  'Cache KPI dashboard (Redis/memoria)',
  kpiCache.includes('KPI_CACHE_TTL_SECONDS') &&
    dashboardSvc.includes('conCacheKpi'),
);
check(
  'I106',
  'Resumen diario materializado + KPIs reportes',
  resumenSvc &&
    schema.includes('tbl_resumen_diario_cobranza') &&
    read('src/lib/cobranza/metric-kpi-service.ts').includes(
      'obtenerResumenDiarioMaterializado',
    ),
);
check(
  'I107',
  'CDN cache headers assets estáticos',
  nextCfg.includes('/_next/static') &&
    nextCfg.includes('immutable') &&
    nextCfg.includes('NEXT_PUBLIC_ASSET_PREFIX'),
);
check(
  'I108',
  'Compresión GraphQL grandes',
  gqlRoute.includes('quizásComprimirGraphqlResponse'),
);
check('I109', 'Lazy ApexCharts compartido', lazyChart);

function noDirectApexOutsideLazy(): boolean {
  const roots = ['src/components', 'src/app'];
  const walk = (dir: string): string[] => {
    if (!fs.existsSync(dir)) {
      return [];
    }
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${entry.name}`.replace(/\\/g, '/');
      if (entry.isDirectory()) {
        out.push(...walk(p));
      } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
        out.push(p);
      }
    }
    return out;
  };
  for (const root of roots) {
    for (const file of walk(root)) {
      if (file.endsWith('lazy-apex-chart.tsx')) {
        continue;
      }
      const text = read(file);
      if (text.includes("from 'react-apexcharts'") || text.includes('from "react-apexcharts"')) {
        return false;
      }
    }
  }
  return true;
}

check(
  'I109b',
  'Sin import directo react-apexcharts fuera de lazy',
  noDirectApexOutsideLazy(),
);
check(
  'I110',
  'Virtualizar tablas TanStack',
  dataTableNow.includes('useVirtualizer') &&
    read('src/components/clientes/cliente-table.tsx').includes('DataTable'),
);
check(
  'I112',
  'Límites candidatos configurables mandante',
  limits.includes('obtenerLimiteCandidatosBandeja') &&
    limits.includes('obtenerLimiteCandidatosMiDia') &&
    read('src/components/cobranza/configuracion-cobranza-panel.tsx').includes(
      'bandejaCandidateLimit',
    ),
);
check('I113', 'Exports async >10k', exportJob);
check('I114', 'Profiling mora recalculo', moraProfile);
check(
  'I115',
  'Import sync delega a async',
  read('src/app/api/cobranza/importar/route.ts').includes('crearImportacionJob'),
);
check(
  'I116',
  'ETag catálogos tipificaciones + UI',
  tipifApi &&
    fs.existsSync('src/hooks/use-catalogos-tipificaciones.ts') &&
    read('src/components/cobranza/gestion-form.tsx').includes(
      'useCatalogosTipificaciones',
    ),
);
check(
  'I117',
  'Import shard por mandante',
  importJob.includes('seleccionarJobsPendientesSharded'),
);
check('I118', 'p95 GraphQL por operación', metricsPlugin);
check('I119', 'Prisma connection warming', instrumentation);

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
