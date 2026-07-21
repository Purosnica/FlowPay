'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { ClientPaginatedDataTable } from '@/components/cobranza/client-paginated-data-table';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { TendenciaRecuperacionChart } from '@/components/cobranza/tendencia-recuperacion-chart';
import { ForecastPanel } from '@/components/cobranza/forecast-panel';
import { PageHeader } from '@/components/ui/page-header';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { usePermisos } from '@/hooks/use-permisos';
import { GET_REPORTES_DASHBOARD } from '@/lib/graphql/queries/cobranza.queries';
import {
  CATALOGO_REPORTES_HUB,
  REPORTE_KEY,
  usuarioPuedeVerReporte,
} from '@/lib/permissions/reporte-permisos';
import {
  type AgingTramoReporte,
  type KpiCobranzaCore,
  type ReporteAgingCartera,
  type ReporteCobranza,
  formatearMoneda,
} from '@/types/cobranza';
import {
  exportAgingCarteraXlsx,
  exportReporteCobranzaXlsx,
} from '@/lib/cobranza/export-reporte-hub-xlsx';
import { ReporteAgingChart } from '@/components/cobranza/reporte-aging-chart';
import { cellMoneda } from '@/components/cobranza/reporte-table-cells';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import { cn } from '@/lib/utils';

function moraTone(pct: number): DashboardMetric['tone'] {
  if (pct >= 50) return 'danger';
  if (pct >= 20) return 'warning';
  return 'default';
}

function buildOpsMetrics(
  kpis: KpiCobranzaCore,
  reporte: ReporteCobranza | undefined,
  usarPeriodo: boolean,
  periodo: string,
): DashboardMetric[] {
  const metrics: DashboardMetric[] = [
    {
      label: 'Tasa de contacto',
      value: `${kpis.tasaContactoPct}%`,
      sub: `${kpis.gestionesMes} gestiones en el mes`,
    },
    {
      label: 'Promesas abiertas',
      value: String(kpis.promesasAbiertas),
    },
    {
      label: 'Acuerdos vigentes',
      value: String(
        reporte?.totalAcuerdosVigentes ?? kpis.acuerdosVigentes,
      ),
    },
  ];

  if (reporte) {
    metrics.push(
      {
        label: 'Préstamos en cartera',
        value: String(reporte.totalPrestamos),
        sub: `${reporte.prestamosEnMora} en mora`,
        tone: moraTone(
          reporte.totalPrestamos > 0
            ? (reporte.prestamosEnMora / reporte.totalPrestamos) * 100
            : 0,
        ),
      },
      {
        label: 'Cartera total',
        value: formatearMoneda(reporte.saldoCartera),
      },
      {
        label: 'Recuperado',
        value: formatearMoneda(reporte.totalRecuperado),
        sub: usarPeriodo
          ? `Periodo ${reporte.periodo ?? periodo}`
          : 'Histórico',
        tone: 'success',
      },
      {
        label: 'Tasa recuperación',
        value: `${reporte.tasaRecuperacion}%`,
        tone:
          reporte.tasaRecuperacion >= 50
            ? 'success'
            : reporte.tasaRecuperacion > 0
              ? 'primary'
              : 'default',
      },
      {
        label: 'Gestiones',
        value: String(reporte.totalGestiones),
      },
    );
  }

  return metrics;
}

export default function ReportesPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [usarPeriodo, setUsarPeriodo] = useState(true);
  const [filtroCatalogo, setFiltroCatalogo] = useState('');
  const permisos = usePermisos();
  const puedeHubCobranza = usuarioPuedeVerReporte(
    permisos,
    REPORTE_KEY.hub,
  );

  const mandanteId = idmandante === '' ? 0 : idmandante;

  const catalogoFiltrado = useMemo(() => {
    const q = filtroCatalogo.trim().toLowerCase();
    return CATALOGO_REPORTES_HUB.filter((item) => {
      if (!usuarioPuedeVerReporte(permisos, item.key)) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        item.label.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q)
      );
    });
  }, [permisos, filtroCatalogo]);

  const catalogoPorCategoria = useMemo(() => {
    const map = new Map<string, typeof catalogoFiltrado>();
    for (const item of catalogoFiltrado) {
      const list = map.get(item.categoria) ?? [];
      list.push(item);
      map.set(item.categoria, list);
    }
    return Array.from(map.entries());
  }, [catalogoFiltrado]);

  const { data, isLoading, error } = useGraphQLQuery<{
    reporteCobranza: ReporteCobranza;
    reporteAgingCartera: ReporteAgingCartera;
    forecastRecuperacion: {
      recuperadoMesActual: number;
      forecastFinMes: number;
      runRateDiario: number;
      diasRestantesMes: number | null;
      metaMes: number | null;
      pctMeta: number | null;
    };
    tendenciaRecuperacion: Array<{ periodo: string; monto: number }>;
    kpisCobranzaCore: KpiCobranzaCore;
  }>(
    GET_REPORTES_DASHBOARD,
    {
      idmandante: mandanteId,
      periodo: usarPeriodo ? periodo : null,
      meses: 6,
    },
    { enabled: mandanteId > 0 && puedeHubCobranza },
  );

  const reporte = data?.reporteCobranza;
  const aging = data?.reporteAgingCartera;
  const tendencia = data?.tendenciaRecuperacion ?? [];
  const kpis = data?.kpisCobranzaCore;
  const forecastRecuperacion = data?.forecastRecuperacion;

  const gestorColumns = useMemo<
    ColumnDef<ReporteCobranza['porGestor'][number]>[]
  >(
    () => [
      { accessorKey: 'nombre', header: 'Gestor' },
      { accessorKey: 'gestiones', header: 'Gestiones' },
      {
        accessorKey: 'montoRecuperado',
        header: 'Recuperado',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.montoRecuperado),
      },
    ],
    [],
  );

  const agingColumns = useMemo<ColumnDef<AgingTramoReporte>[]>(
    () => [
      { accessorKey: 'tramo', header: 'Tramo mora' },
      { accessorKey: 'cantidadPrestamos', header: 'Préstamos' },
      {
        accessorKey: 'saldoTotal',
        header: 'Saldo',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.saldoTotal),
      },
      {
        accessorKey: 'porcentajeSaldo',
        header: '% Cartera',
        cell: ({ row }) => `${row.original.porcentajeSaldo}%`,
      },
    ],
    [],
  );

  const handleExportKpis = () => {
    if (!reporte) return;
    exportReporteCobranzaXlsx(reporte);
  };

  const handleExportAging = () => {
    if (!aging) return;
    exportAgingCarteraXlsx(aging);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reportes de cobranza"
        description="Centro de reportes: busque por nombre o categoría. El menú lateral solo apunta aquí."
        actions={
          puedeHubCobranza ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!reporte}
                onClick={handleExportKpis}
              >
                Exportar KPIs (Excel)
              </Button>
              <Button
                variant="outline"
                disabled={!aging}
                onClick={handleExportAging}
              >
                Exportar aging (Excel)
              </Button>
            </div>
          ) : null
        }
      />

      <div className="space-y-3 rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
              Buscar reporte
            </label>
            <input
              type="search"
              value={filtroCatalogo}
              onChange={(e) => setFiltroCatalogo(e.target.value)}
              placeholder="Ej. comisiones, mora, gerencial..."
              className="w-full rounded border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
            />
          </div>
          <p className="text-xs text-gray-500">
            {catalogoFiltrado.length} disponibles con su permiso
          </p>
        </div>
        {catalogoPorCategoria.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay reportes que coincidan con el filtro o sus permisos.
          </p>
        ) : (
          catalogoPorCategoria.map(([categoria, items]) => (
            <div key={categoria} className="space-y-2">
              <h3 className="text-sm font-semibold text-dark dark:text-white">
                {categoria}
              </h3>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md border border-stroke px-3 py-1.5 text-sm text-dark transition hover:border-primary hover:text-primary dark:border-dark-3 dark:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
        <div className="grid gap-4 sm:grid-cols-3">
          <MandanteSelect
            value={idmandante}
            onChange={setIdmandante}
            label="Mandante"
            selectClassName="w-full rounded border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
              Periodo
            </label>
            <input
              type="month"
              className="w-full rounded border border-stroke px-3 py-2 text-sm disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2"
              value={periodo}
              disabled={!usarPeriodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 pb-2 text-sm text-dark dark:text-white">
              <input
                type="checkbox"
                checked={usarPeriodo}
                onChange={(e) => setUsarPeriodo(e.target.checked)}
              />
              Filtrar por periodo
            </label>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          Error al cargar reporte. Verifique permisos de reportes (cobranza).
        </p>
      )}

      {!mandanteId && (
        <p className="text-sm text-gray-500">Seleccione un mandante.</p>
      )}

      {mandanteId > 0 && isLoading && (
        <p className="text-sm text-gray-500">Cargando reportes...</p>
      )}

      {kpis && (
        <>
          <div className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
            <div className="border-b border-stroke px-4 py-2.5 dark:border-dark-3">
              <p className="text-xs text-gray-5">
                Resumen del mandante · actualiza al cambiar filtros
              </p>
            </div>
            <div className="grid grid-cols-1 divide-y divide-stroke sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-dark-3">
              <div className="min-w-0 bg-primary/[0.06] px-5 py-5 dark:bg-primary/10">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-5">
                  Recuperación del mes
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-primary">
                  {formatearMoneda(kpis.recuperacionMes)}
                </p>
                {forecastRecuperacion?.pctMeta != null && (
                  <p className="mt-1 text-xs text-gray-5">
                    {forecastRecuperacion.pctMeta}% de meta mensual
                  </p>
                )}
              </div>
              <div className="min-w-0 px-5 py-5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-5">
                  Saldo en mora
                </p>
                <p
                  className={cn(
                    'mt-2 text-3xl font-bold tabular-nums',
                    kpis.carteraEnMoraPct >= 50
                      ? 'text-red-700 dark:text-red-300'
                      : kpis.carteraEnMoraPct >= 20
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-dark dark:text-white',
                  )}
                >
                  {kpis.carteraEnMoraPct}%
                </p>
                <p className="mt-1 text-xs text-gray-5">
                  {formatearMoneda(kpis.carteraEnMora)} de{' '}
                  {formatearMoneda(kpis.carteraTotal)}
                </p>
              </div>
            </div>
          </div>

          {forecastRecuperacion && (
            <ForecastPanel
              forecast={{
                recuperadoMesActual: forecastRecuperacion.recuperadoMesActual,
                runRateDiario: forecastRecuperacion.runRateDiario,
                forecastFinMes: forecastRecuperacion.forecastFinMes,
                diasRestantesMes:
                  forecastRecuperacion.diasRestantesMes ?? undefined,
                metaMes: forecastRecuperacion.metaMes,
                pctMeta: forecastRecuperacion.pctMeta,
              }}
            />
          )}

          <div>
            <h2 className="mb-3 text-lg font-semibold text-dark dark:text-white">
              Indicadores operativos
            </h2>
            <DashboardMetricStrip
              metrics={buildOpsMetrics(
                kpis,
                reporte,
                usarPeriodo,
                periodo,
              )}
            />
          </div>
        </>
      )}

      {aging && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-dark dark:text-white">
              Aging de cartera
            </h2>
            <p className="mt-1 text-sm text-gray-5">
              Distribución por días de mora · Saldo total{' '}
              {formatearMoneda(aging.saldoCarteraTotal)} ·{' '}
              {aging.totalPrestamos} préstamos
            </p>
          </div>
          <ReporteAgingChart tramos={aging.tramos} />
          <Card className="rounded-xl" padding="md">
            <CardHeader className="mb-2">
              <CardTitle className="text-base">Detalle por tramo</CardTitle>
            </CardHeader>
            <ClientPaginatedDataTable
              columns={agingColumns}
              data={aging.tramos}
              emptyMessage="Sin datos de aging."
              itemLabel="tramos"
              initialPageSize={10}
              resetKey={`${mandanteId}-${periodo}-${usarPeriodo}`}
            />
          </Card>
        </div>
      )}

      {reporte && (
        <>
          <Card className="rounded-xl" padding="md">
            <CardHeader className="mb-2">
              <div>
                <CardTitle>Desempeño por gestor</CardTitle>
                <p className="mt-1 text-xs text-gray-5">
                  Gestiones y montos recuperados en el periodo seleccionado
                </p>
              </div>
            </CardHeader>
            <ClientPaginatedDataTable
              columns={gestorColumns}
              data={reporte.porGestor}
              emptyMessage="Sin gestiones ni pagos en el periodo."
              itemLabel="gestores"
              initialPageSize={10}
              resetKey={`${mandanteId}-${periodo}-${usarPeriodo}`}
            />
          </Card>

          {tendencia.length > 0 && (
            <TendenciaRecuperacionChart
              tendencia={tendencia}
              titulo="Tendencia de recuperación (6 meses)"
            />
          )}
        </>
      )}
    </div>
  );
}
