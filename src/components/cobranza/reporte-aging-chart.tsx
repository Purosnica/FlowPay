'use client';

import type { ApexOptions } from 'apexcharts';
import { LazyApexChart as Chart } from '@/components/charts/lazy-apex-chart';
import { formatearMoneda, type AgingTramoReporte } from '@/types/cobranza';

/** Colores por severidad de mora (temprano → severo). */
const TRAMO_COLORS = [
  '#22AD5C',
  '#3C50E0',
  '#F59E0B',
  '#F97316',
  '#EF4444',
  '#B91C1C',
];

interface ReporteAgingChartProps {
  tramos: AgingTramoReporte[];
}

function formatAxisSaldo(val: number): string {
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(1)}M`;
  }
  if (val >= 1_000) {
    return `${(val / 1_000).toFixed(0)}K`;
  }
  return val.toLocaleString('es-NI');
}

export function ReporteAgingChart({ tramos }: ReporteAgingChartProps) {
  const colors = tramos.map(
    (_, index) => TRAMO_COLORS[Math.min(index, TRAMO_COLORS.length - 1)],
  );

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
        columnWidth: '55%',
        distributed: true,
      },
    },
    legend: { show: false },
    dataLabels: {
      enabled: true,
      formatter: (_val, opts) => {
        const pct = tramos[opts.dataPointIndex]?.porcentajeSaldo;
        return pct != null && pct > 0 ? `${pct}%` : '';
      },
      style: {
        fontSize: '11px',
        fontWeight: 600,
        colors: ['#122031'],
      },
      offsetY: -4,
    },
    xaxis: {
      categories: tramos.map((t) => t.tramo),
      labels: {
        rotate: tramos.length > 4 ? -35 : 0,
        rotateAlways: tramos.length > 4,
        hideOverlappingLabels: false,
        trim: false,
        style: {
          fontSize: '11px',
          fontWeight: 500,
          colors: '#6B7280',
        },
      },
    },
    yaxis: {
      title: { text: 'Saldo (NIO)', style: { fontSize: '11px' } },
      labels: {
        formatter: (val: number) => formatAxisSaldo(val),
        style: { fontSize: '11px', colors: ['#6B7280'] },
      },
    },
    colors,
    grid: {
      borderColor: '#E6EBF1',
      strokeDashArray: 4,
    },
    tooltip: {
      y: {
        formatter: (val: number, opts) => {
          const tramo = tramos[opts.dataPointIndex];
          const base = formatearMoneda(val);
          if (!tramo) return base;
          return `${base} · ${tramo.cantidadPrestamos} préstamos · ${tramo.porcentajeSaldo}%`;
        },
      },
    },
  };

  const series = [
    {
      name: 'Saldo',
      data: tramos.map((t) => t.saldoTotal),
    },
  ];

  return (
    <div className="rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <h3 className="mb-1 text-sm font-semibold text-dark dark:text-white">
        Distribución de saldo por tramo
      </h3>
      <p className="mb-3 text-xs text-gray-5">
        Color más intenso = mora más severa
      </p>
      <Chart options={options} series={series} type="bar" height={300} />
    </div>
  );
}
