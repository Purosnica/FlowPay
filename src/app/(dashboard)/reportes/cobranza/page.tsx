"use client";

import { useState } from "react";
import { usePagos } from "@/hooks/use-pagos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function ReporteCobranzaPage() {
  const [filters, setFilters] = useState({
    fechaDesde: new Date(new Date().setDate(new Date().getDate() - 30)),
    fechaHasta: new Date(),
  });

  const { data, isLoading } = usePagos({
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
    pageSize: 1000,
  });

  const pagos = (data as { pagos?: { pagos?: any[] } })?.pagos?.pagos || [];

  // Calcular estadísticas
  const totalRecaudado = pagos.reduce(
    (sum, pago) => sum + Number(pago.montoTotal),
    0
  );
  const totalCapital = pagos.reduce(
    (sum, pago) => sum + Number(pago.montoCapital),
    0
  );
  const totalInteres = pagos.reduce(
    (sum, pago) => sum + Number(pago.montoInteres),
    0
  );
  const totalMora = pagos.reduce(
    (sum, pago) => sum + Number(pago.montoMora),
    0
  );

  // Agrupar por día
  const pagosPorDia: Record<string, number> = {};
  pagos.forEach((pago) => {
    const fecha = new Date(pago.fechaPago).toLocaleDateString("es-PY");
    pagosPorDia[fecha] = (pagosPorDia[fecha] || 0) + Number(pago.montoTotal);
  });

  const chartData = {
    series: [
      {
        name: "Recuperación",
        data: Object.values(pagosPorDia),
      },
    ],
    options: {
      chart: {
        type: "area" as const,
        height: 350,
        toolbar: {
          show: true,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "smooth" as const,
      },
      xaxis: {
        categories: Object.keys(pagosPorDia),
      },
      yaxis: {
        labels: {
          formatter: (value: number) =>
            new Intl.NumberFormat("es-PY", {
              style: "currency",
              currency: "PYG",
              notation: "compact",
            }).format(value),
        },
      },
      tooltip: {
        y: {
          formatter: (value: number) =>
            new Intl.NumberFormat("es-PY", {
              style: "currency",
              currency: "PYG",
            }).format(value),
        },
      },
      colors: ["#3C50E0"],
    },
  };

  // Agrupar por método de pago
  const pagosPorMetodo: Record<string, number> = {};
  pagos.forEach((pago) => {
    pagosPorMetodo[pago.metodoPago] =
      (pagosPorMetodo[pago.metodoPago] || 0) + Number(pago.montoTotal);
  });

  const pieChartData = {
    series: Object.values(pagosPorMetodo),
    options: {
      chart: {
        type: "pie" as const,
        height: 350,
      },
      labels: Object.keys(pagosPorMetodo),
      legend: {
        position: "bottom" as const,
      },
      tooltip: {
        y: {
          formatter: (value: number) =>
            new Intl.NumberFormat("es-PY", {
              style: "currency",
              currency: "PYG",
            }).format(value),
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Reporte de Cobranza
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <DateInput
              label="Fecha Desde"
              value={filters.fechaDesde}
              onChange={(date) =>
                setFilters({ ...filters, fechaDesde: date || new Date() })
              }
            />
            <DateInput
              label="Fecha Hasta"
              value={filters.fechaHasta}
              onChange={(date) =>
                setFilters({ ...filters, fechaHasta: date || new Date() })
              }
            />
            <div className="flex items-end">
              <Button onClick={() => {}} className="w-full">
                Generar Reporte
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Recaudado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("es-PY", {
                    style: "currency",
                    currency: "PYG",
                  }).format(totalRecaudado)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Capital</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {new Intl.NumberFormat("es-PY", {
                    style: "currency",
                    currency: "PYG",
                  }).format(totalCapital)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Interés</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {new Intl.NumberFormat("es-PY", {
                    style: "currency",
                    currency: "PYG",
                  }).format(totalInteres)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Mora</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {new Intl.NumberFormat("es-PY", {
                    style: "currency",
                    currency: "PYG",
                  }).format(totalMora)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recuperación por Día</CardTitle>
              </CardHeader>
              <CardContent>
                {typeof window !== "undefined" && (
                  <Chart
                    options={chartData.options}
                    series={chartData.series}
                    type="area"
                    height={350}
                  />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recuperación por Método de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                {typeof window !== "undefined" && (
                  <Chart
                    options={pieChartData.options}
                    series={pieChartData.series}
                    type="pie"
                    height={350}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

