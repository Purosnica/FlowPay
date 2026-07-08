/**
 * Auditoría estática de escalabilidad FlowPay.
 * Ejecutar: npx tsx scripts/audit-scalability.ts
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

const prismaFile = read('src/lib/prisma.ts');
const rateLimitService = read('src/lib/security/rate-limit-service.ts');
const schema = read('prisma/schema.prisma');
const cronOrch = read('src/lib/cron/cron-orchestrator.ts');
const asyncImport = read('src/app/api/cobranza/importar/async/route.ts');
const cronImportRoute = read('src/app/api/cron/procesar-importaciones/route.ts');
const vercel = read('vercel.json');
const envFile = read('src/lib/env.ts');
const retention = read('src/lib/cobranza/auditoria-retention-service.ts');
const cronRegistry = read('src/lib/cron/cron-registry.ts');
const importJobs = read('src/lib/cobranza/import/importacion-job-service.ts');
const uploadLimits = read('src/lib/cobranza/upload-limits.ts');
const importForm = read('src/components/cobranza/importar-cartera-form.tsx');

check(
  'S-1',
  'Prisma singleton en globalThis (prod)',
  prismaFile.includes('globalForPrisma.prisma = prisma') &&
    !prismaFile.includes('!== "production"'),
);

check(
  'S-2',
  'Rate limit distribuido (DB)',
  rateLimitService.includes('checkRateLimitDb') &&
    rateLimitService.includes('tbl_rate_limit'),
);

check(
  'S-3',
  'Tabla tbl_rate_limit en schema',
  schema.includes('model tbl_rate_limit'),
);

check(
  'S-4',
  'Cron con bloqueo MySQL GET_LOCK',
  cronOrch.includes('adquirirBloqueoMysql') &&
    cronOrch.includes('liberarBloqueoMysql'),
);

check(
  'S-5',
  'Import async dispara procesamiento inmediato',
  asyncImport.includes('procesarImportacionesPendientes'),
);

check(
  'S-6',
  'Cron dedicado procesar-importaciones',
  cronImportRoute.includes('procesarImportacionesPendientes') &&
    vercel.includes('/api/cron/procesar-importaciones'),
);

check(
  'S-7',
  'env valida JWT_SECRET y CRON_SECRET en producción',
  envFile.includes('JWT_SECRET') && envFile.includes('CRON_SECRET'),
);

check(
  'S-8',
  'Retención auditoría/cron configurada',
  retention.includes('purgarDatosHistoricos') &&
    cronRegistry.includes('auditoria_retencion'),
);

check(
  'S-9',
  'Import jobs: recuperación atascados y concurrencia',
  importJobs.includes('recuperarImportacionesAtascadas') &&
    importJobs.includes('obtenerImportMaxConcurrent'),
);

check(
  'S-10',
  'Límites upload centralizados',
  uploadLimits.includes('MAX_IMPORT_FILE_BYTES'),
);

check(
  'S-11',
  'Importación async por defecto en UI',
  importForm.includes('useState(true)'),
);

console.log('=== SCALABILITY AUDIT ===');
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
