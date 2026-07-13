'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AlertasOperativasPanelProps {
  promesasVencidas: number;
  acuerdosEnRiesgo: number;
  reclamosFueraSla: number;
}

export function AlertasOperativasPanel({
  promesasVencidas,
  acuerdosEnRiesgo,
  reclamosFueraSla,
}: AlertasOperativasPanelProps) {
  const total = promesasVencidas + acuerdosEnRiesgo + reclamosFueraSla;
  const hasAlerts = total > 0;

  const alertas = [
    {
      label: 'Promesas vencidas',
      value: promesasVencidas,
      href: '/cobranza/bandeja?soloPromesaVencida=1',
      alert: promesasVencidas > 0,
    },
    {
      label: 'Acuerdos en riesgo',
      value: acuerdosEnRiesgo,
      href: '/cobranza/cartera?estado=Con%20acuerdo',
      alert: acuerdosEnRiesgo > 0,
    },
    {
      label: 'Reclamos fuera SLA',
      value: reclamosFueraSla,
      href: '/cobranza/reclamos',
      alert: reclamosFueraSla > 0,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-dark dark:text-white">
          Alertas operativas
        </h2>
        <Link
          href="/cobranza/bandeja?preset=inbox_operativo"
          className="text-sm font-medium text-primary hover:underline"
        >
          Abrir inbox operativo →
        </Link>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-xl border shadow-sm',
          hasAlerts
            ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20'
            : 'border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke px-4 py-3 dark:border-dark-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-5">
              Alertas activas
            </p>
            <p
              className={cn(
                'mt-0.5 text-2xl font-bold tabular-nums',
                hasAlerts
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-green-dark dark:text-green',
              )}
            >
              {total}
            </p>
            <p className="mt-0.5 text-xs text-gray-5">
              {hasAlerts
                ? 'Requieren atención inmediata'
                : 'Sin alertas activas'}
            </p>
          </div>
        </div>

        <div className="grid divide-x divide-y divide-stroke sm:grid-cols-3 dark:divide-dark-3">
          {alertas.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'min-w-0 px-4 py-3 transition-colors hover:bg-primary/[0.06] dark:hover:bg-primary/10',
                item.alert &&
                  'bg-amber-50/80 dark:bg-amber-950/25',
              )}
            >
              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-5">
                {item.label}
              </p>
              <p
                className={cn(
                  'mt-1 text-xl font-bold tabular-nums',
                  item.alert
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-dark dark:text-white',
                )}
              >
                {item.value}
              </p>
              <p className="mt-1 text-xs font-medium text-primary">
                Ver detalle →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
