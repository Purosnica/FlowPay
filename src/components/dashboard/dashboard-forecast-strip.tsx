'use client';

import Link from 'next/link';
import { formatearMoneda } from '@/types/cobranza';
import type { ForecastPanelData } from '@/components/cobranza/forecast-panel';
import { cn } from '@/lib/utils';

interface DashboardForecastStripProps {
  forecast: ForecastPanelData;
}

export function DashboardForecastStrip({
  forecast,
}: DashboardForecastStripProps) {
  const items = [
    {
      label: 'Recuperado mes',
      value: formatearMoneda(forecast.recuperadoMesActual),
      sub:
        forecast.metaMes != null && forecast.pctMeta != null
          ? `${forecast.pctMeta}% de meta`
          : undefined,
    },
    {
      label: 'Run-rate diario',
      value: formatearMoneda(forecast.runRateDiario),
    },
    {
      label: 'Forecast fin de mes',
      value: formatearMoneda(forecast.forecastFinMes),
      sub: `${forecast.diasRestantesMes} días rest.`,
      primary: true,
    },
    ...(forecast.metaMes != null
      ? [
          {
            label: 'Meta del mes',
            value: formatearMoneda(forecast.metaMes),
            sub:
              forecast.pctMeta != null
                ? `Avance ${forecast.pctMeta}%`
                : undefined,
          },
        ]
      : []),
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <div className="flex items-center justify-between border-b border-stroke px-4 py-2.5 dark:border-dark-3">
        <h3 className="text-sm font-semibold text-dark dark:text-white">
          Forecast
        </h3>
        <Link
          href="/cobranza/centro-inteligencia"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Detalle →
        </Link>
      </div>
      <div
        className={cn(
          'grid divide-x divide-stroke dark:divide-dark-3',
          items.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3',
        )}
      >
        {items.map((item) => (
          <div key={item.label} className="min-w-0 px-4 py-3">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-5">
              {item.label}
            </p>
            <p
              className={cn(
                'mt-1 truncate text-base font-bold tabular-nums',
                'primary' in item && item.primary
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
  );
}
