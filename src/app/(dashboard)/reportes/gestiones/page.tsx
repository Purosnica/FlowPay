"use client";

import { useState } from "react";
import { useGestiones } from "@/hooks/use-gestiones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const tipoGestionLabels: Record<string, string> = {
  LLAMADA: "Llamada",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  VISITA: "Visita",
  CORREO: "Correo",
  OTRO: "Otro",
};

const estadoLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONTACTADO: "Contactado",
  PROMESA: "Promesa",
  NO_CONTACTADO: "No Contactado",
  NO_INTERESADO: "No Interesado",
  ESCALADA: "Escalada",
  CERRADA: "Cerrada",
};

export default function ReporteGestionesPage() {
  const [filters, setFilters] = useState({
    fechaDesde: new Date(new Date().setDate(new Date().getDate() - 30)),
    fechaHasta: new Date(),
  });

  const { data, isLoading } = useGestiones({
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta,
    pageSize: 1000,
  });

  const gestiones = (data as { gestionesCobro?: { gestiones?: any[] } })?.gestionesCobro?.gestiones || [];

  // Estadísticas
  const totalGestiones = gestiones.length;
  const gestionesPorTipo: Record<string, number> = {};
  const gestionesPorEstado: Record<string, number> = {};

  gestiones.forEach((gestion) => {
    gestionesPorTipo[gestion.tipoGestion] =
      (gestionesPorTipo[gestion.tipoGestion] || 0) + 1;
    gestionesPorEstado[gestion.estado] =
      (gestionesPorEstado[gestion.estado] || 0) + 1;
  });

  const tipoChartData = {
    series: Object.values(gestionesPorTipo),
    options: {
      chart: {
        type: "bar" as const,
        height: 350,
      },
      xaxis: {
        categories: Object.keys(gestionesPorTipo).map(
          (key) => tipoGestionLabels[key] || key
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
    series: Object.values(gestionesPorEstado),
    options: {
      chart: {
        type: "donut" as const,
        height: 350,
      },
      labels: Object.keys(gestionesPorEstado).map(
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
          Reporte de Gestiones
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
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total de Gestiones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{totalGestiones}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Tipos de Gestión</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {Object.keys(gestionesPorTipo).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Estados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {Object.keys(gestionesPorEstado).length}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Gestiones por Tipo</CardTitle>
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
                <CardTitle>Gestiones por Estado</CardTitle>
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

          <Card>
            <CardHeader>
              <CardTitle>Desglose por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {Object.entries(gestionesPorTipo).map(([tipo, cantidad]) => (
                  <div
                    key={tipo}
                    className="flex items-center justify-between rounded-lg border border-stroke p-4 dark:border-dark-3"
                  >
                    <span className="text-dark dark:text-white">
                      {tipoGestionLabels[tipo] || tipo}
                    </span>
                    <Badge variant="info">{cantidad}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

