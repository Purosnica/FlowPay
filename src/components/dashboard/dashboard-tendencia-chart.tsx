'use client';

import type { ApexOptions } from 'apexcharts';
import { LazyApexChart as Chart } from '@/components/charts/lazy-apex-chart';
import { formatearMoneda } from '@/types/cobranza';

interface TendenciaItem {
  periodo: string;
  monto: number;
}

interface DashboardTendenciaChartProps {
  tendencia: TendenciaItem[];
}

export function DashboardTendenciaChart({
  tendencia,
}: DashboardTendenciaChartProps) {
  if (tendencia.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
        <h3 className="text-sm font-semibold text-dark dark:text-white">
          Tendencia de recuperación
        </h3>
        <p className="mt-10 text-center text-sm text-gray-500">
          Sin datos de tendencia disponibles.
        </p>
      </div>
    );
  }

  const options: ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    colors: ['#5750F1'],
    xaxis: {
      categories: tendencia.map((t) => t.periodo),
      labels: { style: { fontSize: '11px' } },
    },
    yaxis: {
      labels: {
        formatter: (val: number) =>
          val >= 1_000_000
            ? `${(val / 1_000_000).toFixed(1)}M`
            : val >= 1_000
              ? `${(val / 1_000).toFixed(0)}K`
              : String(Math.round(val)),
      },
    },
    tooltip: {
      y: { formatter: (val: number) => formatearMoneda(val) },
    },
    grid: { borderColor: '#E6EBF1', strokeDashArray: 4 },
  };

  const series = [
    {
      name: 'Recuperado',
      data: tendencia.map((t) => t.monto),
    },
  ];

  return (
    <div className="flex h-full flex-col rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <h3 className="text-sm font-semibold text-dark dark:text-white">
        Tendencia de recuperación
      </h3>
      <p className="mt-0.5 text-xs text-gray-500">Monto recuperado por periodo</p>
      <div className="mt-1 flex-1">
        <Chart options={options} series={series} type="area" height={260} />
      </div>
    </div>
  );
}
