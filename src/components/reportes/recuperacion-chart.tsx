"use client";

import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import { RECUPERACION_REAL_VS_ESPERADA } from "@/lib/graphql/queries/finanzas.queries";
import dynamic from "next/dynamic";
import { useMemo } from "react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type RecuperacionItem = {
  periodo: string;
  montoEsperado: number;
  montoReal: number;
  porcentajeRecuperacion: number;
  diferencia: number;
};

type RecuperacionResponse = {
  recuperacionRealVsEsperada: {
    items: RecuperacionItem[];
    montoTotalEsperado: number;
    montoTotalReal: number;
    porcentajeTotalRecuperacion: number;
  };
};

interface RecuperacionChartProps {
  filters?: any;
}

export function RecuperacionChart({ filters }: RecuperacionChartProps) {
  const { data, isLoading, isError } = useGraphQLQuery<RecuperacionResponse>(
    RECUPERACION_REAL_VS_ESPERADA,
    { filters }
  );

  const chartData = useMemo(() => {
    if (!data?.recuperacionRealVsEsperada) return null;

    const items = data?.recuperacionRealVsEsperada?.items || [];
    const periodos = items.map((item) => {
      const [year, month] = item.periodo.split("-");
      return `${month}/${year}`;
    });

    return {
      series: [
        {
          name: "Esperado",
          data: items.map((item) => item.montoEsperado / 1000),
        },
        {
          name: "Real",
          data: items.map((item) => item.montoReal / 1000),
        },
      ],
      options: {
        chart: {
          type: "line",
          height: 350,
          toolbar: { show: true },
        },
        stroke: {
          curve: "smooth",
          width: 3,
        },
        xaxis: {
          categories: periodos,
        },
        yaxis: {
          title: {
            text: "Monto (miles)",
          },
        },
        tooltip: {
          y: {
            formatter: (val: number) => `$${val.toFixed(2)}K`,
          },
        },
        colors: ["#3C50E0", "#10B981"],
        legend: {
          position: "top",
          horizontalAlign: "right",
        },
        markers: {
          size: 5,
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
        Error al cargar datos de recuperación
      </div>
    );
  }

  const { montoTotalEsperado, montoTotalReal, porcentajeTotalRecuperacion } =
    data?.recuperacionRealVsEsperada || { montoTotalEsperado: 0, montoTotalReal: 0, porcentajeTotalRecuperacion: 0 };

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white">
          Recuperación Real vs Esperada
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Comparación de pagos programados vs pagos recibidos
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Esperado</p>
          <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
            ${(montoTotalEsperado / 1000).toFixed(0)}K
          </p>
        </div>
        <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Real</p>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            ${(montoTotalReal / 1000).toFixed(0)}K
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-dark-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">% Recuperación</p>
          <p className="text-lg font-semibold text-dark dark:text-white">
            {porcentajeTotalRecuperacion.toFixed(1)}%
          </p>
        </div>
        <div
          className={`rounded-lg p-3 ${
            montoTotalReal >= montoTotalEsperado
              ? "bg-green-50 dark:bg-green-900/20"
              : "bg-red-50 dark:bg-red-900/20"
          }`}
        >
          <p className="text-xs text-gray-600 dark:text-gray-400">Diferencia</p>
          <p
            className={`text-lg font-semibold ${
              montoTotalReal >= montoTotalEsperado
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            ${((montoTotalReal - montoTotalEsperado) / 1000).toFixed(0)}K
          </p>
        </div>
      </div>

      <Chart
        options={chartData.options as any}
        series={chartData.series}
        type="line"
        height={350}
      />
    </div>
  );
}




