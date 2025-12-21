"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface PrestamosChartProps {
  data: Array<{
    fecha: string;
    cantidad: number;
    montoTotal: number;
  }>;
  loading?: boolean;
}

export function PrestamosChart({ data, loading }: PrestamosChartProps) {
  const chartData = useMemo(() => {
    const fechas = data.map((item) => {
      const date = new Date(item.fecha);
      return date.toLocaleDateString("es-PY", { month: "short", day: "numeric" });
    });
    const cantidades = data.map((item) => item.cantidad);
    const montos = data.map((item) => item.montoTotal);

    return {
      series: [
        {
          name: "Cantidad",
          type: "column",
          data: cantidades,
        },
        {
          name: "Monto (PYG)",
          type: "line",
          data: montos,
        },
      ],
      options: {
        chart: {
          type: "line",
          fontFamily: "inherit",
          toolbar: {
            show: false,
          },
        },
        stroke: {
          width: [0, 3],
          curve: "smooth",
        },
        xaxis: {
          categories: fechas,
          labels: {
            rotate: -45,
            style: {
              fontSize: "12px",
            },
          },
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
              text: "Monto (PYG)",
            },
            labels: {
              formatter: (val: number) => {
                if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
                return val.toString();
              },
            },
          },
        ],
        colors: ["#3b82f6", "#10b981"],
        fill: {
          opacity: [0.85, 1],
        },
        legend: {
          position: "top",
        },
        tooltip: {
          y: {
            formatter: (val: number, opts: any) => {
              if (opts.seriesIndex === 0) {
                return `${val} préstamos`;
              }
              return new Intl.NumberFormat("es-PY", {
                style: "currency",
                currency: "PYG",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(val);
            },
          },
        },
      },
    };
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
        Préstamos Emitidos (Últimos 30 Días)
      </h3>
      <Chart
        options={chartData.options as any}
        series={chartData.series}
        type="line"
        height={300}
      />
    </div>
  );
}



