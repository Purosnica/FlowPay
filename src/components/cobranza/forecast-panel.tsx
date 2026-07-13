'use client';

import { formatearMoneda } from '@/types/cobranza';
import { cn } from '@/lib/utils';

export interface ForecastPanelData {
  recuperadoMesActual: number;
  runRateDiario: number;
  forecastFinMes: number;
  diasRestantesMes?: number;
  metaMes?: number | null;
  pctMeta?: number | null;
}

interface ForecastPanelProps {
  forecast: ForecastPanelData;
  className?: string;
}

export function ForecastPanel({ forecast, className }: ForecastPanelProps) {
  const hasMeta = forecast.metaMes != null;
  const pctMeta = forecast.pctMeta ?? 0;
  const progressPct = Math.min(Math.max(pctMeta, 0), 100);

  const items = [
    {
      label: 'Recuperado mes actual',
      value: formatearMoneda(forecast.recuperadoMesActual),
      sub:
        hasMeta && forecast.pctMeta != null
          ? `${forecast.pctMeta}% de meta`
          : undefined,
      primary: false,
    },
    {
      label: 'Run-rate diario',
      value: formatearMoneda(forecast.runRateDiario),
      primary: false,
    },
    {
      label: 'Forecast fin de mes',
      value: formatearMoneda(forecast.forecastFinMes),
      sub:
        forecast.diasRestantesMes != null
          ? `${forecast.diasRestantesMes} días restantes`
          : 'Proyección lineal',
      primary: true,
    },
    ...(hasMeta
      ? [
          {
            label: 'Meta del mes',
            value: formatearMoneda(forecast.metaMes ?? 0),
            sub:
              forecast.pctMeta != null
                ? `Avance: ${forecast.pctMeta}%`
                : undefined,
            primary: false,
          },
        ]
      : []),
  ];

  return (
    <div className={cn('space-y-3', className)}>
      <h2 className="text-lg font-semibold text-dark dark:text-white">
        Proyección del mes
      </h2>

      <div className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
        {hasMeta && (
          <div className="border-b border-stroke px-4 py-3 dark:border-dark-3">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-gray-5">
              <span>Avance hacia la meta</span>
              <span className="font-semibold tabular-nums text-dark dark:text-white">
                {forecast.pctMeta}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progressPct}%` }}
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}

        <div
          className={cn(
            'grid divide-x divide-y divide-stroke dark:divide-dark-3',
            items.length === 4
              ? 'grid-cols-2 lg:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-3',
          )}
        >
          {items.map((item) => (
            <div key={item.label} className="min-w-0 px-4 py-3">
              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-5">
                {item.label}
              </p>
              <p
                className={cn(
                  'mt-1 truncate text-base font-bold tabular-nums sm:text-lg',
                  item.primary
                    ? 'text-primary'
                    : 'text-dark dark:text-white',
                )}
                title={item.value}
              >
                {item.value}
              </p>
              {item.sub ? (
                <p className="mt-0.5 truncate text-xs text-gray-5">{item.sub}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
