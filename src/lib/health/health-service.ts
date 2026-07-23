/**
 * Readiness ampliado: DB + SMTP (si configurado) + storage escribible + cron lock (I034).
 */

import { access, constants, mkdir } from 'fs/promises';
import { prisma } from '@/lib/prisma';
import { smtpDisponible } from '@/lib/services/email-service';
import { DOCUMENTOS_STORAGE_DIR } from '@/lib/cobranza/documento-storage';
import {
  adquirirBloqueoMysql,
  liberarBloqueoMysql,
} from '@/lib/scalability/mysql-advisory-lock';

export type HealthStatus = {
  status: 'ok';
  service: 'flowpay';
  ts: string;
};

export type ReadyChecks = {
  database: 'up' | 'down';
  smtp: 'up' | 'down' | 'skipped';
  storage: 'up' | 'down';
  cronLock: 'up' | 'down';
};

export type ReadyStatus =
  | {
      status: 'ready';
      service: 'flowpay';
      checks: ReadyChecks;
      ts: string;
    }
  | {
      status: 'not_ready';
      service: 'flowpay';
      checks: ReadyChecks;
      ts: string;
      error?: string;
    };

export function buildLiveness(): HealthStatus {
  return {
    status: 'ok',
    service: 'flowpay',
    ts: new Date().toISOString(),
  };
}

async function checkStorage(): Promise<'up' | 'down'> {
  try {
    await mkdir(DOCUMENTOS_STORAGE_DIR, { recursive: true });
    await access(DOCUMENTOS_STORAGE_DIR, constants.W_OK);
    return 'up';
  } catch {
    return 'down';
  }
}

async function checkCronLock(): Promise<'up' | 'down'> {
  const nombre = 'flowpay:ready:probe';
  try {
    const ok = await adquirirBloqueoMysql(nombre, 0);
    if (!ok) {
      return 'up';
    }
    await liberarBloqueoMysql(nombre);
    return 'up';
  } catch {
    return 'down';
  }
}

export async function checkReadiness(): Promise<ReadyStatus> {
  const ts = new Date().toISOString();
  const checks: ReadyChecks = {
    database: 'down',
    smtp: 'skipped',
    storage: 'down',
    cronLock: 'down',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'up';
  } catch {
    return {
      status: 'not_ready',
      service: 'flowpay',
      checks,
      ts,
      error: 'db_unreachable',
    };
  }

  checks.smtp = smtpDisponible() ? 'up' : 'skipped';
  checks.storage = await checkStorage();
  checks.cronLock = await checkCronLock();

  const criticoOk =
    checks.database === 'up' &&
    checks.storage === 'up' &&
    checks.cronLock === 'up';

  if (!criticoOk) {
    return {
      status: 'not_ready',
      service: 'flowpay',
      checks,
      ts,
      error: 'dependency_check_failed',
    };
  }

  return {
    status: 'ready',
    service: 'flowpay',
    checks,
    ts,
  };
}
