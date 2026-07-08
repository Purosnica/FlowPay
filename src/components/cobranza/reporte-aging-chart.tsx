'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import type { AgingTramoReporte } from '@/types/cobranza';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ReporteAgingChartProps {
  tramos: AgingTramoReporte[];
}

export function ReporteAgingChart({ tramos }: ReporteAgingChartProps) {
  const options: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: {
      bar: { borderRadius: 4, horizontal: false, columnWidth: '55%' },
    },
    dataLabels: { enabled: false },
    xaxis: { categories: tramos.map((t) => t.tramo) },
    yaxis: { title: { text: 'Saldo (NIO)' } },
    colors: ['#3C50E0'],
    tooltip: {
      y: { formatter: (val: number) => val.toLocaleString('es-NI') },
    },
  };

  const series = [
    {
      name: 'Saldo',
      data: tramos.map((t) => t.saldoTotal),
    },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-dark">
      <h3 className="mb-2 text-sm font-medium text-gray-600">
        Distribución de saldo por tramo
      </h3>
      <Chart options={options} series={series} type="bar" height={280} />
    </div>
  );
}
