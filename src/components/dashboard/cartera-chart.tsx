"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface CarteraChartProps {
  carteraActiva: number;
  carteraVencida: number;
  loading?: boolean;
}

export function CarteraChart({ carteraActiva, carteraVencida, loading }: CarteraChartProps) {
  const chartData = useMemo(() => {
    const total = carteraActiva + carteraVencida;
    const activaPercent = total > 0 ? (carteraActiva / total) * 100 : 0;
    const vencidaPercent = total > 0 ? (carteraVencida / total) * 100 : 0;

    return {
      series: [activaPercent, vencidaPercent],
      options: {
        chart: {
          type: "donut",
          fontFamily: "inherit",
        },
        labels: ["Cartera Activa", "Cartera Vencida"],
        colors: ["#10b981", "#ef4444"],
        legend: {
          position: "bottom",
        },
        dataLabels: {
          enabled: true,
          formatter: (val: number) => `${val.toFixed(1)}%`,
        },
        tooltip: {
          y: {
            formatter: (val: number) => {
              const monto = total > 0 ? (val / 100) * total : 0;
              return new Intl.NumberFormat("es-PY", {
                style: "currency",
                currency: "PYG",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(monto);
            },
          },
        },
        plotOptions: {
          pie: {
            donut: {
              labels: {
                show: true,
                name: {
                  show: true,
                  fontSize: "14px",
                  fontWeight: 600,
                },
                value: {
                  show: true,
                  fontSize: "20px",
                  fontWeight: 700,
                  formatter: () => {
                    return new Intl.NumberFormat("es-PY", {
                      style: "currency",
                      currency: "PYG",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(total);
                  },
                },
              },
            },
          },
        },
      },
    };
  }, [carteraActiva, carteraVencida]);

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
        Cartera Activa vs Vencida
      </h3>
      <Chart
        options={chartData.options as any}
        series={chartData.series}
        type="donut"
        height={300}
      />
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Activa</p>
          <p className="text-lg font-semibold text-green-600">
            {new Intl.NumberFormat("es-PY", {
              style: "currency",
              currency: "PYG",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(carteraActiva)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Vencida</p>
          <p className="text-lg font-semibold text-red-600">
            {new Intl.NumberFormat("es-PY", {
              style: "currency",
              currency: "PYG",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(carteraVencida)}
          </p>
        </div>
      </div>
    </div>
  );
}



