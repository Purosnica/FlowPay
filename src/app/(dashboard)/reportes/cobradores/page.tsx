"use client";

import { useState } from "react";
import { useCobradores } from "@/hooks/use-cobradores";
import { useAsignaciones } from "@/hooks/use-asignacion";
import { usePagos } from "@/hooks/use-pagos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { AdvancedTable } from "@/components/ui/advanced-table";
import { type ColumnDef } from "@tanstack/react-table";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function ReporteCobradoresPage() {
  const [filters, setFilters] = useState({
    fechaDesde: new Date(new Date().setDate(new Date().getDate() - 30)),
    fechaHasta: new Date(),
  });

  const { data: cobradoresData, isLoading: loadingCobradores } = useCobradores();
  const { data: pagosData, isLoading: loadingPagos } = usePagos({
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
    pageSize: 1000,
  });

  const cobradores = (cobradoresData as { usuarios?: any[] })?.usuarios || [];
  const pagos = (pagosData as { pagos?: { pagos?: any[] } })?.pagos?.pagos || [];

  // Calcular estadísticas por cobrador
  const estadisticasPorCobrador = cobradores.map((cobrador: any) => {
    const pagosCobrador = pagos.filter(
      (pago: any) => pago.idusuario === cobrador.idusuario
    );
    const totalRecaudado = pagosCobrador.reduce(
      (sum: number, pago: any) => sum + Number(pago.montoTotal),
      0
    );

    return {
      idusuario: cobrador.idusuario,
      nombre: cobrador.nombre,
      email: cobrador.email,
      totalPagos: pagosCobrador.length,
      totalRecaudado,
      promedioPago:
        pagosCobrador.length > 0 ? totalRecaudado / pagosCobrador.length : 0,
    };
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "nombre",
      header: "Cobrador",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-dark dark:text-white">{row.original.nombre}</p>
          <p className="text-sm text-gray-6 dark:text-dark-6">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: "totalPagos",
      header: "Total Pagos",
      cell: ({ row }) => (
        <Badge variant="info">{row.original.totalPagos}</Badge>
      ),
    },
    {
      accessorKey: "totalRecaudado",
      header: "Total Recaudado",
      cell: ({ row }) =>
        new Intl.NumberFormat("es-PY", {
          style: "currency",
          currency: "PYG",
        }).format(row.original.totalRecaudado),
    },
    {
      accessorKey: "promedioPago",
      header: "Promedio por Pago",
      cell: ({ row }) =>
        new Intl.NumberFormat("es-PY", {
          style: "currency",
          currency: "PYG",
        }).format(row.original.promedioPago),
    },
  ];

  // Datos para gráfico
  const chartData = {
    series: [
      {
        name: "Recuperación",
        data: estadisticasPorCobrador.map((e) => e.totalRecaudado),
      },
    ],
    options: {
      chart: {
        type: "bar" as const,
        height: 350,
        toolbar: {
          show: true,
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
        },
      },
      dataLabels: {
        enabled: false,
      },
      xaxis: {
        categories: estadisticasPorCobrador.map((e) => e.nombre),
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

  const isLoading = loadingCobradores || loadingPagos;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Reporte de Cobradores
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
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Cobradores</CardTitle>
            </CardHeader>
            <CardContent>
              {typeof window !== "undefined" && (
                <Chart
                  options={chartData.options}
                  series={chartData.series}
                  type="bar"
                  height={350}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Detalle por Cobrador ({estadisticasPorCobrador.length}{" "}
                {estadisticasPorCobrador.length === 1 ? "cobrador" : "cobradores"})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdvancedTable
                data={estadisticasPorCobrador.sort(
                  (a, b) => b.totalRecaudado - a.totalRecaudado
                )}
                columns={columns}
                emptyMessage="No se encontraron datos"
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

