/**
 * Health / readiness checks (liveness vs DB).
 */

import { prisma } from '@/lib/prisma';

export type HealthStatus = {
  status: 'ok';
  service: 'flowpay';
  ts: string;
};

export type ReadyStatus =
  | {
      status: 'ready';
      service: 'flowpay';
      database: 'up';
      ts: string;
    }
  | {
      status: 'not_ready';
      service: 'flowpay';
      database: 'down';
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

export async function checkReadiness(): Promise<ReadyStatus> {
  const ts = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ready',
      service: 'flowpay',
      database: 'up',
      ts,
    };
  } catch (err) {
    return {
      status: 'not_ready',
      service: 'flowpay',
      database: 'down',
      ts,
      error: err instanceof Error ? err.message : 'db_unreachable',
    };
  }
}
