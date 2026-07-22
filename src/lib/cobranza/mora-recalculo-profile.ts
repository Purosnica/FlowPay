/**
 * Profiling liviano para cron de recálculo de mora en carteras grandes.
 */

export interface MoraBatchProfile {
  batchIndex: number;
  size: number;
  durationMs: number;
  actualizados: number;
}

export interface MoraRecalculoProfile {
  evaluados: number;
  actualizados: number;
  batches: number;
  totalMs: number;
  avgBatchMs: number;
  p95BatchMs: number;
  maxBatchMs: number;
  samples: MoraBatchProfile[];
}

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

export function resumirPerfilMora(
  samples: MoraBatchProfile[],
  totalMs: number,
): MoraRecalculoProfile {
  const durations = samples.map((s) => s.durationMs).sort((a, b) => a - b);
  const evaluados = samples.reduce((acc, s) => acc + s.size, 0);
  const actualizados = samples.reduce((acc, s) => acc + s.actualizados, 0);
  const avgBatchMs =
    samples.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / samples.length)
      : 0;

  return {
    evaluados,
    actualizados,
    batches: samples.length,
    totalMs,
    avgBatchMs,
    p95BatchMs: Math.round(percentile(durations, 95)),
    maxBatchMs: durations.length > 0 ? durations[durations.length - 1]! : 0,
    samples: samples.slice(0, 20),
  };
}
