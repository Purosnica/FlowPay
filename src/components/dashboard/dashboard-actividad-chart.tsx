'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface DashboardActividadChartProps {
  gestionesMes: number;
  pagosMes: number;
  pagosConciliadosMes: number;
  reclamosAbiertos: number;
  promesasVencidas: number;
}

export function DashboardActividadChart({
  gestionesMes,
  pagosMes,
  pagosConciliadosMes,
  reclamosAbiertos,
  promesasVencidas,
}: DashboardActividadChartProps) {
  const categories = [
    'Gestiones',
    'Pagos',
    'Conciliados',
    'Reclamos',
    'Promesas venc.',
  ];
  const values = [
    gestionesMes,
    pagosMes,
    pagosConciliadosMes,
    reclamosAbiertos,
    promesasVencidas,
  ];

  const options: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: '55%',
        distributed: true,
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    xaxis: {
      categories,
      labels: { style: { fontSize: '11px' } },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => String(Math.round(val)),
      },
    },
    colors: ['#5750F1', '#3C50E0', '#22AD5C', '#F59E0B', '#F23030'],
    grid: { borderColor: '#E6EBF1', strokeDashArray: 4 },
  };

  const series = [{ name: 'Cantidad', data: values }];

  return (
    <div className="flex h-full flex-col rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <h3 className="text-sm font-semibold text-dark dark:text-white">
        Actividad del mes
      </h3>
      <p className="mt-0.5 text-xs text-gray-500">
        Gestiones, pagos y alertas
      </p>
      <div className="mt-1 flex-1">
        <Chart options={options} series={series} type="bar" height={260} />
      </div>
    </div>
  );
}
