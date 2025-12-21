"use client";

import { useState } from "react";
import { useAcuerdos } from "@/hooks/use-acuerdos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const tipoAcuerdoLabels: Record<string, string> = {
  PROMESA_DE_PAGO: "Promesa de Pago",
  CONVENIO_PARCIAL: "Convenio Parcial",
  CONVENIO_TOTAL: "Convenio Total",
  REFINANCIAMIENTO: "Refinanciamiento",
  REESTRUCTURADO: "Reestructurado",
};

const estadoLabels: Record<string, string> = {
  ACTIVO: "Activo",
  VENCIDO: "Vencido",
  CUMPLIDO: "Cumplido",
  INCUMPLIDO: "Incumplido",
};

export default function ReporteAcuerdosPage() {
  const [filters, setFilters] = useState({
    fechaDesde: new Date(new Date().setDate(new Date().getDate() - 30)),
    fechaHasta: new Date(),
  });

  const { data, isLoading } = useAcuerdos({
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
    pageSize: 1000,
  });

  const acuerdos = (data as { acuerdos?: { acuerdos?: any[] } })?.acuerdos?.acuerdos || [];

  // Estadísticas
  const totalAcuerdos = acuerdos.length;
  const acuerdosActivos = acuerdos.filter((a) => a.estado === "ACTIVO").length;
  const acuerdosVencidos = acuerdos.filter((a) => a.estado === "VENCIDO").length;
  const acuerdosCumplidos = acuerdos.filter((a) => a.estado === "CUMPLIDO").length;
  const totalMontoAcordado = acuerdos.reduce(
    (sum, acuerdo) => sum + Number(acuerdo.montoAcordado),
    0
  );

  const acuerdosPorTipo: Record<string, number> = {};
  const acuerdosPorEstado: Record<string, number> = {};

  acuerdos.forEach((acuerdo) => {
    acuerdosPorTipo[acuerdo.tipoAcuerdo] =
      (acuerdosPorTipo[acuerdo.tipoAcuerdo] || 0) + 1;
    acuerdosPorEstado[acuerdo.estado] =
      (acuerdosPorEstado[acuerdo.estado] || 0) + 1;
  });

  const tipoChartData = {
    series: Object.values(acuerdosPorTipo),
    options: {
      chart: {
        type: "bar" as const,
        height: 350,
      },
      xaxis: {
        categories: Object.keys(acuerdosPorTipo).map(
          (key) => tipoAcuerdoLabels[key] || key
        ),
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
      colors: ["#3C50E0"],
    },
  };

  const estadoChartData = {
    series: Object.values(acuerdosPorEstado),
    options: {
      chart: {
        type: "donut" as const,
        height: 350,
      },
      labels: Object.keys(acuerdosPorEstado).map(
        (key) => estadoLabels[key] || key
      ),
      legend: {
        position: "bottom" as const,
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Reporte de Acuerdos
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
                <CardTitle>Total Acuerdos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{totalAcuerdos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{acuerdosActivos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Vencidos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{acuerdosVencidos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Monto Acordado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {new Intl.NumberFormat("es-PY", {
                    style: "currency",
                    currency: "PYG",
                  }).format(totalMontoAcordado)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Acuerdos por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                {typeof window !== "undefined" && (
                  <Chart
                    options={tipoChartData.options}
                    series={tipoChartData.series}
                    type="bar"
                    height={350}
                  />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Acuerdos por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                {typeof window !== "undefined" && (
                  <Chart
                    options={estadoChartData.options}
                    series={estadoChartData.series}
                    type="donut"
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

