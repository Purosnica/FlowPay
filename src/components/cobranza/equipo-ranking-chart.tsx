'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import { formatearMoneda } from '@/types/cobranza';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export interface RankingRow {
  idgestor: number;
  nombre: string;
  gestiones: number;
  montoRecuperado: number;
  efectividadPct: number;
}

interface EquipoRankingChartProps {
  ranking: RankingRow[];
}

export function EquipoRankingChart({ ranking }: EquipoRankingChartProps) {
  if (ranking.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <p className="text-sm text-gray-500">Sin ranking disponible.</p>
      </div>
    );
  }

  const top = ranking.slice(0, 8);

  const options: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: '70%',
        distributed: true,
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    xaxis: {
      categories: top.map((r) => r.nombre),
      labels: {
        formatter: (val: string) => {
          const n = Number(val);
          if (Number.isNaN(n)) return val;
          return n >= 1_000_000
            ? `${(n / 1_000_000).toFixed(1)}M`
            : n >= 1_000
              ? `${(n / 1_000).toFixed(0)}K`
              : String(Math.round(n));
        },
      },
    },
    colors: [
      '#5750F1',
      '#3C50E0',
      '#5475E5',
      '#8099EC',
      '#22AD5C',
      '#F59E0B',
      '#F59460',
      '#F23030',
    ],
    tooltip: {
      y: { formatter: (val: number) => formatearMoneda(val) },
    },
    grid: { borderColor: '#E6EBF1', strokeDashArray: 4 },
  };

  const series = [
    {
      name: 'Recuperado',
      data: top.map((r) => r.montoRecuperado),
    },
  ];

  return (
    <div className="flex h-full flex-col rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <h3 className="text-sm font-semibold text-dark dark:text-white">
        Ranking por recuperación
      </h3>
      <p className="mt-0.5 text-xs text-gray-500">Top del equipo este mes</p>
      <div className="mt-1 flex-1">
        <Chart options={options} series={series} type="bar" height={260} />
      </div>
    </div>
  );
}
