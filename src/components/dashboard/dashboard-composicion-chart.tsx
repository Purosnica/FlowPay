'use client';

import type { ApexOptions } from 'apexcharts';
import { LazyApexChart as Chart } from '@/components/charts/lazy-apex-chart';
import { formatearMoneda } from '@/types/cobranza';

interface DashboardComposicionChartProps {
  carteraTotal: number;
  carteraEnMora: number;
  carteraEnMoraPct: number;
}

export function DashboardComposicionChart({
  carteraTotal,
  carteraEnMora,
  carteraEnMoraPct,
}: DashboardComposicionChartProps) {
  const alDia = Math.max(carteraTotal - carteraEnMora, 0);

  const options: ApexOptions = {
    chart: { type: 'donut', toolbar: { show: false } },
    labels: ['En mora', 'Al día'],
    colors: ['#F23030', '#22AD5C'],
    legend: { position: 'bottom' },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: { show: true, fontSize: '13px' },
            value: {
              show: true,
              fontSize: '22px',
              fontWeight: 700,
              formatter: () => `${carteraEnMoraPct}%`,
            },
            total: {
              show: true,
              label: 'Mora',
              formatter: () => `${carteraEnMoraPct}%`,
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => formatearMoneda(val),
      },
    },
  };

  const series = [carteraEnMora, alDia];

  return (
    <div className="flex h-full flex-col rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <h3 className="text-sm font-semibold text-dark dark:text-white">
        Composición de cartera
      </h3>
      <p className="mt-0.5 text-xs text-gray-500">
        Mora vs al día · {formatearMoneda(carteraTotal)}
      </p>
      <div className="mt-1 flex-1">
        <Chart options={options} series={series} type="donut" height={260} />
      </div>
    </div>
  );
}
