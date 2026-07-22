'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type { ApexOptions } from 'apexcharts';

/**
 * Lazy-load de ApexCharts (fuera del bundle inicial).
 * Un solo punto de import para todos los charts del dashboard/reportes.
 */
const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center text-sm text-gray-500">
      Cargando gráfico…
    </div>
  ),
});

type ApexChartProps = ComponentProps<typeof ReactApexChart>;

export interface LazyApexChartProps {
  type: NonNullable<ApexChartProps['type']>;
  series: NonNullable<ApexChartProps['series']>;
  options: ApexOptions;
  width?: string | number;
  height?: string | number;
}

export function LazyApexChart(props: LazyApexChartProps) {
  return <ReactApexChart {...props} />;
}
