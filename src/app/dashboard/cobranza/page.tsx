"use client";

import { usePagos } from "@/hooks/use-pagos";
import { useGestiones } from "@/hooks/use-gestiones";
import { useAcuerdos } from "@/hooks/use-acuerdos";
import { useAcuerdosVencidos } from "@/hooks/use-acuerdos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import { useMemo } from "react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function DashboardCobranzaPage() {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));

  const { data: pagosData, isLoading: loadingPagos } = usePagos({
    fechaDesde: inicioMes,
    fechaHasta: new Date(),
    pageSize: 1000,
  });

  const { data: pagosHoyData } = usePagos({
    fechaDesde: inicioDia,
    fechaHasta: new Date(),
    pageSize: 1000,
  });

  const { data: gestionesData, isLoading: loadingGestiones } = useGestiones({
    fechaDesde: inicioDia,
    fechaHasta: new Date(),
    pageSize: 1000,
  });

  const { data: acuerdosData, isLoading: loadingAcuerdos } = useAcuerdos({
    pageSize: 1000,
  });

  const { data: acuerdosVencidosData } = useAcuerdosVencidos({
    pageSize: 100,
  });

  const pagos = (pagosData as { pagos?: { pagos?: any[] } })?.pagos?.pagos || [];
  const pagosHoy = (pagosHoyData as { pagos?: { pagos?: any[] } })?.pagos?.pagos || [];
  const gestiones = (gestionesData as { gestionesCobro?: { gestiones?: any[] } })?.gestionesCobro?.gestiones || [];
  const acuerdos = (acuerdosData as { acuerdos?: { acuerdos?: any[] } })?.acuerdos?.acuerdos || [];
  const acuerdosVencidos = (acuerdosVencidosData as { acuerdosVencidos?: { acuerdos?: any[] } })?.acuerdosVencidos?.acuerdos || [];

  // Calcular estadísticas
  const totalRecaudado = useMemo(
    () =>
      pagos.reduce((sum, pago) => sum + Number(pago.montoTotal), 0),
    [pagos]
  );

  const recuperacionHoy = useMemo(
    () =>
      pagosHoy.reduce((sum, pago) => sum + Number(pago.montoTotal), 0),
    [pagosHoy]
  );

  const totalMora = useMemo(
    () =>
      pagos.reduce((sum, pago) => sum + Number(pago.montoMora), 0),
    [pagos]
  );

  const acuerdosActivos = acuerdos.filter((a) => a.estado === "ACTIVO").length;

  // Recuperación por día (últimos 7 días)
  const ultimos7Dias = useMemo(() => {
    const dias: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toLocaleDateString("es-PY");
      dias[fechaStr] = 0;
    }
    return dias;
  }, []);

  pagos.forEach((pago) => {
    const fecha = new Date(pago.fechaPago).toLocaleDateString("es-PY");
    if (ultimos7Dias[fecha] !== undefined) {
      ultimos7Dias[fecha] += Number(pago.montoTotal);
    }
  });

  // Recuperación por cobrador
  const recuperacionPorCobrador: Record<string, number> = {};
  pagos.forEach((pago: any) => {
    if (pago.usuario) {
      const nombre = pago.usuario.nombre || "Sin asignar";
      recuperacionPorCobrador[nombre] =
        (recuperacionPorCobrador[nombre] || 0) + Number(pago.montoTotal);
    }
  });

  const chartRecuperacionDia = {
    series: [
      {
        name: "Recuperación",
        data: Object.values(ultimos7Dias),
      },
    ],
    options: {
      chart: {
        type: "area" as const,
        height: 300,
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth" as const },
      xaxis: {
        categories: Object.keys(ultimos7Dias),
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
      colors: ["#3C50E0"],
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

  const chartRecuperacionCobrador = {
    series: Object.values(recuperacionPorCobrador),
    options: {
      chart: {
        type: "bar" as const,
        height: 300,
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          horizontal: true,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: Object.keys(recuperacionPorCobrador),
      },
      colors: ["#3C50E0"],
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

  const isLoading = loadingPagos || loadingGestiones || loadingAcuerdos;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark dark:text-white">
        Dashboard de Cobranza
      </h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Tarjetas de resumen */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Recaudado (Mes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("es-PY", {
                    style: "currency",
                    currency: "PYG",
                  }).format(totalRecaudado)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Recuperación Hoy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat("es-PY", {
                    style: "currency",
                    currency: "PYG",
                  }).format(recuperacionHoy)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Mora</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {new Intl.NumberFormat("es-PY", {
                    style: "currency",
                    currency: "PYG",
                  }).format(totalMora)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Promesas Vencidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {acuerdosVencidos.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas adicionales */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Acuerdos Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dark dark:text-white">
                  {acuerdosActivos}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Gestiones Hoy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dark dark:text-white">
                  {gestiones.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Pagos (Mes)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dark dark:text-white">
                  {pagos.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recuperación por Día (Últimos 7 días)</CardTitle>
              </CardHeader>
              <CardContent>
                {typeof window !== "undefined" && (
                  <Chart
                    options={chartRecuperacionDia.options}
                    series={chartRecuperacionDia.series}
                    type="area"
                    height={300}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ranking de Cobradores</CardTitle>
              </CardHeader>
              <CardContent>
                {typeof window !== "undefined" &&
                Object.keys(recuperacionPorCobrador).length > 0 ? (
                  <Chart
                    options={chartRecuperacionCobrador.options}
                    series={chartRecuperacionCobrador.series}
                    type="bar"
                    height={300}
                  />
                ) : (
                  <p className="text-center text-gray-6 dark:text-dark-6 py-12">
                    No hay datos disponibles
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Acuerdos vencidos */}
          {acuerdosVencidos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Acuerdos Vencidos ({acuerdosVencidos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {acuerdosVencidos.slice(0, 5).map((acuerdo: any) => (
                    <div
                      key={acuerdo.idacuerdo}
                      className="flex items-center justify-between rounded-lg border border-stroke p-3 dark:border-dark-3"
                    >
                      <div>
                        <p className="font-medium text-dark dark:text-white">
                          Préstamo {acuerdo.prestamo?.codigo || acuerdo.idprestamo}
                        </p>
                        <p className="text-sm text-gray-6 dark:text-dark-6">
                          Vencido:{" "}
                          {new Date(acuerdo.fechaFin).toLocaleDateString("es-PY")}
                        </p>
                      </div>
                      <Badge variant="danger">Vencido</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

