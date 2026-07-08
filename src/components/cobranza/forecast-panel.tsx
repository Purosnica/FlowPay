'use client';

import { formatearMoneda } from '@/types/cobranza';

export interface ForecastPanelData {
  recuperadoMesActual: number;
  runRateDiario: number;
  forecastFinMes: number;
  diasRestantesMes: number;
  metaMes?: number | null;
  pctMeta?: number | null;
}

interface ForecastPanelProps {
  forecast: ForecastPanelData;
  className?: string;
}

export function ForecastPanel({ forecast, className }: ForecastPanelProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${className ?? ''}`}>
      <div className="rounded-lg border p-4 dark:border-dark-3">
        <p className="text-xs text-gray-500">Recuperado mes actual</p>
        <p className="text-xl font-bold">
          {formatearMoneda(forecast.recuperadoMesActual)}
        </p>
        {forecast.metaMes != null && forecast.pctMeta != null && (
          <p className="text-xs text-gray-400">
            {forecast.pctMeta}% de meta ({formatearMoneda(forecast.metaMes)})
          </p>
        )}
      </div>
      <div className="rounded-lg border p-4 dark:border-dark-3">
        <p className="text-xs text-gray-500">Run-rate diario</p>
        <p className="text-xl font-bold">
          {formatearMoneda(forecast.runRateDiario)}
        </p>
      </div>
      <div className="rounded-lg border p-4 dark:border-dark-3">
        <p className="text-xs text-gray-500">Forecast fin de mes</p>
        <p className="text-xl font-bold text-primary">
          {formatearMoneda(forecast.forecastFinMes)}
        </p>
        <p className="text-xs text-gray-400">
          {forecast.diasRestantesMes} días restantes
        </p>
      </div>
      {forecast.metaMes != null && (
        <div className="rounded-lg border p-4 dark:border-dark-3">
          <p className="text-xs text-gray-500">Meta del mes</p>
          <p className="text-xl font-bold">
            {formatearMoneda(forecast.metaMes)}
          </p>
          {forecast.pctMeta != null && (
            <p className="text-xs text-gray-400">Avance: {forecast.pctMeta}%</p>
          )}
        </div>
      )}
    </div>
  );
}
