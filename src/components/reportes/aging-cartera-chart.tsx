"use client";

import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import { AGING_CARTERA } from "@/lib/graphql/queries/finanzas.queries";
import dynamic from "next/dynamic";
import { useMemo } from "react";

// Importar ApexCharts dinámicamente para evitar problemas de SSR
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type AgingItem = {
  rango: string;
  diasMin: number;
  diasMax: number;
  cantidad: number;
  monto: number;
  porcentaje: number;
};

type AgingResponse = {
  agingCartera: {
    items: AgingItem[];
    total: number;
    montoTotal: number;
  };
};

interface AgingCarteraChartProps {
  filters?: any;
}

export function AgingCarteraChart({ filters }: AgingCarteraChartProps) {
  const { data, isLoading, isError } = useGraphQLQuery<AgingResponse>(
    AGING_CARTERA,
    { filters }
  );

  const chartData = useMemo(() => {
    if (!data?.agingCartera) return null;

    const items = data.agingCartera.items;

    return {
      series: [
        {
          name: "Cantidad de Préstamos",
          data: items.map((item) => item.cantidad),
        },
        {
          name: "Monto (en miles)",
          data: items.map((item) => item.monto / 1000),
        },
      ],
      options: {
        chart: {
          type: "bar",
          height: 350,
          toolbar: { show: true },
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: "55%",
            endingShape: "rounded",
          },
        },
        dataLabels: {
          enabled: false,
        },
        stroke: {
          show: true,
          width: 2,
          colors: ["transparent"],
        },
        xaxis: {
          categories: items.map((item) => item.rango),
        },
        yaxis: [
          {
            title: {
              text: "Cantidad",
            },
          },
          {
            opposite: true,
            title: {
              text: "Monto (miles)",
            },
          },
        ],
        fill: {
          opacity: 1,
        },
        tooltip: {
          y: {
            formatter: function (val: number, opts: any) {
              if (opts.seriesIndex === 0) {
                return `${val} préstamos`;
              }
              return `$${val.toFixed(2)}K`;
            },
          },
        },
        colors: ["#3C50E0", "#8FD0EF"],
        legend: {
          position: "top",
          horizontalAlign: "right",
        },
      },
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (isError || !chartData) {
    return (
      <div className="flex items-center justify-center h-96 text-red-500">
        Error al cargar datos de aging de cartera
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white">
          Aging de Cartera
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Distribución de préstamos por días de atraso
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-dark-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Préstamos</p>
          <p className="text-lg font-semibold text-dark dark:text-white">
            {data?.agingCartera?.total || 0}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-dark-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">Monto Total</p>
          <p className="text-lg font-semibold text-dark dark:text-white">
            ${data?.agingCartera?.montoTotal ? ((data.agingCartera.montoTotal / 1000).toFixed(0)) : "0"}K
          </p>
        </div>
      </div>

      <Chart
        options={chartData.options as any}
        series={chartData.series}
        type="bar"
        height={350}
      />

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
        {data?.agingCartera?.items?.map((item) => (
          <div
            key={item.rango}
            className="rounded-lg border border-stroke p-2 dark:border-dark-3"
          >
            <p className="font-semibold text-dark dark:text-white">{item.rango}</p>
            <p className="text-gray-600 dark:text-gray-400">
              {item.cantidad} préstamos
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              ${(item.monto / 1000).toFixed(0)}K ({item.porcentaje.toFixed(1)}%)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}




