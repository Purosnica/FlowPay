"use client";

import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import { MORA_PROMEDIO } from "@/lib/graphql/queries/finanzas.queries";
import dynamic from "next/dynamic";
import { useMemo } from "react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type MoraItem = {
  periodo: string;
  moraPromedio: number;
  cantidadPrestamos: number;
  montoTotalMora: number;
};

type MoraResponse = {
  moraPromedio: {
    items: MoraItem[];
    moraPromedioGeneral: number;
  };
};

interface MoraPromedioChartProps {
  filters?: any;
}

export function MoraPromedioChart({ filters }: MoraPromedioChartProps) {
  const { data, isLoading, isError } = useGraphQLQuery<MoraResponse>(
    MORA_PROMEDIO,
    { filters }
  );

  const chartData = useMemo(() => {
    if (!data?.moraPromedio) return null;

    const items = data?.moraPromedio?.items || [];
    const periodos = items.map((item) => {
      const [year, month] = item.periodo.split("-");
      return `${month}/${year}`;
    });

    return {
      series: [
        {
          name: "Mora Promedio (días)",
          data: items.map((item) => item.moraPromedio),
        },
      ],
      options: {
        chart: {
          type: "area",
          height: 350,
          toolbar: { show: true },
        },
        stroke: {
          curve: "smooth",
          width: 3,
        },
        fill: {
          type: "gradient",
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.3,
            stops: [0, 100],
          },
        },
        xaxis: {
          categories: periodos,
        },
        yaxis: {
          title: {
            text: "Días de mora",
          },
        },
        tooltip: {
          y: {
            formatter: (val: number) => `${val.toFixed(1)} días`,
          },
        },
        colors: ["#EF4444"],
        markers: {
          size: 5,
        },
        dataLabels: {
          enabled: true,
          formatter: (val: number) => val.toFixed(1),
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
        Error al cargar datos de mora promedio
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white">
          Mora Promedio
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Evolución de la mora promedio mensual
        </p>
      </div>

      <div className="mb-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
        <p className="text-xs text-gray-600 dark:text-gray-400">Mora Promedio General</p>
        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
          {data?.moraPromedio?.moraPromedioGeneral ? data.moraPromedio.moraPromedioGeneral.toFixed(1) : "0"} días
        </p>
      </div>

      <Chart
        options={chartData.options as any}
        series={chartData.series}
        type="area"
        height={350}
      />

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        {data?.moraPromedio?.items?.slice(-4).map((item) => {
          const [year, month] = item.periodo.split("-");
          return (
            <div
              key={item.periodo}
              className="rounded-lg border border-stroke p-2 dark:border-dark-3"
            >
              <p className="font-semibold text-dark dark:text-white">
                {month}/{year}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {item.moraPromedio.toFixed(1)} días
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {item.cantidadPrestamos} préstamos
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}




