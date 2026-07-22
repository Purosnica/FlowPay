/**
 * Métricas p95 por operación GraphQL (sin APM completo).
 * Rolling window en memoria del proceso.
 */

import { logger } from '@/lib/utils/logger';

const WINDOW_SIZE = 200;
const LOG_EVERY = 50;

interface OpStats {
  samples: number[];
  count: number;
}

const statsByOp = new Map<string, OpStats>();

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx] ?? 0;
}

function recordSample(operation: string, durationMs: number): void {
  let stats = statsByOp.get(operation);
  if (!stats) {
    stats = { samples: [], count: 0 };
    statsByOp.set(operation, stats);
  }
  stats.samples.push(durationMs);
  if (stats.samples.length > WINDOW_SIZE) {
    stats.samples.shift();
  }
  stats.count += 1;

  if (stats.count % LOG_EVERY === 0) {
    const sorted = [...stats.samples].sort((a, b) => a - b);
    logger.info('GraphQL operation latency', {
      operation,
      count: stats.count,
      p50Ms: Math.round(percentile(sorted, 50)),
      p95Ms: Math.round(percentile(sorted, 95)),
      p99Ms: Math.round(percentile(sorted, 99)),
      lastMs: Math.round(durationMs),
    });
  }
}

export function obtenerMetricasOperacion(
  operation: string,
): { count: number; p50Ms: number; p95Ms: number; p99Ms: number } | null {
  const stats = statsByOp.get(operation);
  if (!stats || stats.samples.length === 0) {
    return null;
  }
  const sorted = [...stats.samples].sort((a, b) => a - b);
  return {
    count: stats.count,
    p50Ms: Math.round(percentile(sorted, 50)),
    p95Ms: Math.round(percentile(sorted, 95)),
    p99Ms: Math.round(percentile(sorted, 99)),
  };
}

export function obtenerResumenMetricasGraphql(): Array<{
  operation: string;
  count: number;
  p95Ms: number;
}> {
  const rows: Array<{ operation: string; count: number; p95Ms: number }> = [];
  for (const [operation, stats] of statsByOp) {
    if (stats.samples.length === 0) {
      continue;
    }
    const sorted = [...stats.samples].sort((a, b) => a - b);
    rows.push({
      operation,
      count: stats.count,
      p95Ms: Math.round(percentile(sorted, 95)),
    });
  }
  return rows.sort((a, b) => b.p95Ms - a.p95Ms);
}

type ExecuteArgs = {
  args: {
    contextValue?: unknown;
    document?: { definitions?: Array<{ kind?: string; name?: { value?: string } }> };
    operationName?: string | null;
  };
};

/**
 * Plugin Yoga/Envelop: mide duración por operationName.
 */
export function useOperationMetricsPlugin() {
  return {
    onExecute({ args }: ExecuteArgs) {
      const started = Date.now();
      const opName =
        args.operationName?.trim() ||
        args.document?.definitions?.find((d) => d.kind === 'OperationDefinition')
          ?.name?.value ||
        'anonymous';

      return {
        onExecuteDone() {
          recordSample(opName, Date.now() - started);
        },
      };
    },
  };
}
