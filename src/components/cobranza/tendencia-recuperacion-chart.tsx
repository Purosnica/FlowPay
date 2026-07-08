'use client';

import { formatearMoneda } from '@/types/cobranza';

interface TendenciaItem {
  periodo: string;
  monto: number;
}

interface TendenciaRecuperacionChartProps {
  tendencia: TendenciaItem[];
  titulo?: string;
}

export function TendenciaRecuperacionChart({
  tendencia,
  titulo = 'Tendencia de recuperación',
}: TendenciaRecuperacionChartProps) {
  if (tendencia.length === 0) {
    return (
      <p className="text-sm text-gray-500">Sin datos de tendencia disponibles.</p>
    );
  }

  const maxTendencia = Math.max(...tendencia.map((t) => t.monto), 1);

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">{titulo}</h2>
      <div className="space-y-2 rounded-lg border p-4 dark:border-dark-3">
        {tendencia.map((t) => (
          <div key={t.periodo}>
            <div className="mb-1 flex justify-between text-xs">
              <span>{t.periodo}</span>
              <span>{formatearMoneda(t.monto)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.round((t.monto / maxTendencia) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
