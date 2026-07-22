'use client';

import { formatearMoneda } from '@/types/cobranza';

export interface BulkImpactStats {
  cantidad: number;
  saldoTotal?: number;
  moneda?: string;
  gestoresAfectados?: number;
  etiquetaEntidad?: string;
}

interface BulkImpactPreviewProps {
  stats: BulkImpactStats;
  accionResumen: string;
  className?: string;
}

/**
 * Resumen de impacto antes de una acción masiva (I049).
 */
export function BulkImpactPreview({
  stats,
  accionResumen,
  className,
}: BulkImpactPreviewProps) {
  const entidad = stats.etiquetaEntidad ?? 'casos';
  const moneda = stats.moneda ?? 'NIO';

  return (
    <div
      className={
        className ??
        'rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30'
      }
      role="status"
      aria-live="polite"
    >
      <p className="font-medium text-amber-900 dark:text-amber-200">
        Impacto estimado
      </p>
      <p className="mt-1 text-amber-800 dark:text-amber-300">{accionResumen}</p>
      <ul className="mt-3 grid gap-1 text-amber-900 dark:text-amber-200 sm:grid-cols-2">
        <li>
          <span className="text-amber-700 dark:text-amber-400">Selección:</span>{' '}
          {stats.cantidad} {entidad}
        </li>
        {stats.saldoTotal != null ? (
          <li>
            <span className="text-amber-700 dark:text-amber-400">
              Saldo involucrado:
            </span>{' '}
            {formatearMoneda(stats.saldoTotal, moneda)}
          </li>
        ) : null}
        {stats.gestoresAfectados != null ? (
          <li>
            <span className="text-amber-700 dark:text-amber-400">
              Gestores afectados:
            </span>{' '}
            {stats.gestoresAfectados}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
