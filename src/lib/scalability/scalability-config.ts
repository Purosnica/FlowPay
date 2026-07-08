/**
 * Configuración de escalabilidad (env con defaults seguros).
 */

export const CRON_MASTER_LOCK_NAME = 'flowpay:cron:operaciones_cobranza';

export function obtenerImportMaxJobsPerRun(): number {
  const raw = process.env.IMPORT_MAX_JOBS_PER_RUN;
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.min(parsed, 5);
}

export function obtenerImportMaxConcurrent(): number {
  const raw = process.env.IMPORT_MAX_CONCURRENT;
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.min(parsed, 3);
}

export function obtenerImportStuckMinutes(): number {
  const raw = process.env.IMPORT_STUCK_MINUTES;
  const parsed = raw ? Number.parseInt(raw, 10) : 30;
  if (!Number.isFinite(parsed) || parsed < 5) {
    return 30;
  }
  return parsed;
}

export function obtenerAuditRetentionDays(): number {
  const raw = process.env.AUDIT_RETENTION_DAYS;
  const parsed = raw ? Number.parseInt(raw, 10) : 90;
  if (!Number.isFinite(parsed) || parsed < 7) {
    return 90;
  }
  return parsed;
}

export function obtenerCronRetentionDays(): number {
  const raw = process.env.CRON_RETENTION_DAYS;
  const parsed = raw ? Number.parseInt(raw, 10) : 90;
  if (!Number.isFinite(parsed) || parsed < 7) {
    return 90;
  }
  return parsed;
}

export function usarRateLimitDb(): boolean {
  return (
    process.env.RATE_LIMIT_STORE === 'db' ||
    process.env.NODE_ENV === 'production'
  );
}
