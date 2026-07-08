'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import { formatearMoneda } from '@/types/cobranza';
import type { DashboardGerenteEquipo } from '@/types/cobranza';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface EquipoSupervisoresChartProps {
  equipos: DashboardGerenteEquipo[];
}

export function EquipoSupervisoresChart({
  equipos,
}: EquipoSupervisoresChartProps) {
  if (equipos.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <p className="text-sm text-gray-500">Sin equipos registrados.</p>
      </div>
    );
  }

  const options: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: {
      bar: { borderRadius: 6, columnWidth: '55%' },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: equipos.map((e) => e.nombreSupervisor),
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
    colors: ['#5750F1'],
    tooltip: {
      y: { formatter: (val: number) => formatearMoneda(val) },
    },
    grid: { borderColor: '#E6EBF1', strokeDashArray: 4 },
  };

  const series = [
    {
      name: 'Recuperado',
      data: equipos.map((e) => e.montoRecuperadoMes),
    },
  ];

  return (
    <div className="flex h-full flex-col rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <h3 className="text-sm font-semibold text-dark dark:text-white">
        Recuperación por supervisor
      </h3>
      <p className="mt-0.5 text-xs text-gray-500">Desempeño del mes</p>
      <div className="mt-1 flex-1">
        <Chart options={options} series={series} type="bar" height={260} />
      </div>
    </div>
  );
}
