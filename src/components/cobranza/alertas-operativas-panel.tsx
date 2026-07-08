'use client';

import Link from 'next/link';

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
      <div className="flex items-center justify-between">
        <div className="rounded-lg border p-4 dark:border-dark-3">
          <p className="text-xs text-gray-500">Alertas activas (total)</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{total}</p>
        </div>
        <Link
          href="/cobranza/bandeja?preset=inbox_operativo"
          className="text-sm text-primary hover:underline"
        >
          Abrir inbox operativo →
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {alertas.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`rounded-lg border p-3 transition hover:border-primary dark:border-dark-3 ${
              item.alert
                ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20'
                : ''
            }`}
          >
            <p className="text-xs text-gray-500">{item.label}</p>
            <p
              className={`mt-1 text-xl font-bold ${
                item.alert ? 'text-amber-700 dark:text-amber-300' : ''
              }`}
            >
              {item.value}
            </p>
            <p className="mt-1 text-xs text-primary">Ver detalle →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
