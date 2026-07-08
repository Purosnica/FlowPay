'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ClientPaginatedDataTable } from '@/components/cobranza/client-paginated-data-table';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/cobranza/kpi-card';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { TendenciaRecuperacionChart } from '@/components/cobranza/tendencia-recuperacion-chart';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import {
  GET_REPORTES_DASHBOARD,
} from '@/lib/graphql/queries/cobranza.queries';
import {
  type AgingTramoReporte,
  type KpiCobranzaCore,
  type ReporteAgingCartera,
  type ReporteCobranza,
  formatearMoneda,
} from '@/types/cobranza';

import { exportReporteCsv } from '@/lib/cobranza/export-reporte-csv';
import { exportAgingCsv } from '@/lib/cobranza/export-aging-csv';
import { ReporteAgingChart } from '@/components/cobranza/reporte-aging-chart';
import { periodoActual } from '@/lib/cobranza/periodo-utils';

export default function ReportesPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [usarPeriodo, setUsarPeriodo] = useState(true);

  const mandanteId = idmandante === '' ? 0 : idmandante;

  const { data, isLoading, error } = useGraphQLQuery<{
    reporteCobranza: ReporteCobranza;
    reporteAgingCartera: ReporteAgingCartera;
    forecastRecuperacion: {
      recuperadoMesActual: number;
      forecastFinMes: number;
      runRateDiario: number;
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
    { enabled: mandanteId > 0 },
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
        cell: ({ row }) => formatearMoneda(row.original.montoRecuperado),
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
        cell: ({ row }) => formatearMoneda(row.original.saldoTotal),
      },
      {
        accessorKey: 'porcentajeSaldo',
        header: '% Cartera',
        cell: ({ row }) => `${row.original.porcentajeSaldo}%`,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes de cobranza"
        description="Indicadores de cartera, aging, recuperación y desempeño por gestor."
      />

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-dark">
        <div className="grid gap-4 sm:grid-cols-3">
          <MandanteSelect
            value={idmandante}
            onChange={setIdmandante}
            label="Mandante"
            selectClassName="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
          <div>
            <label className="mb-1 block text-sm font-medium">Periodo</label>
            <input
              type="month"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
              value={periodo}
              disabled={!usarPeriodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={usarPeriodo}
                onChange={(e) => setUsarPeriodo(e.target.checked)}
              />
              Filtrar por periodo
            </label>
            <Button
              variant="outline"
              disabled={!reporte}
              onClick={() => {
                if (!reporte) {
                  return;
                }
                const csv = exportReporteCsv(reporte);
                const blob = new Blob([csv], {
                  type: 'text/csv;charset=utf-8;',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `reporte-cobranza-${reporte.periodo ?? 'historico'}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Exportar KPIs
            </Button>
            <Button
              variant="outline"
              disabled={!aging}
              onClick={() => {
                if (!aging) {
                  return;
                }
                const csv = exportAgingCsv(aging);
                const blob = new Blob([csv], {
                  type: 'text/csv;charset=utf-8;',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `aging-cartera-${mandanteId}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Exportar aging
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          Error al cargar reporte. Verifique permiso REPORTE_READ.
        </p>
      )}

      {!mandanteId && (
        <p className="text-sm text-gray-500">Seleccione un mandante.</p>
      )}

      {mandanteId > 0 && isLoading && (
        <p className="text-sm text-gray-500">Cargando reportes...</p>
      )}

      {forecastRecuperacion && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Recuperado mes actual"
            value={formatearMoneda(forecastRecuperacion.recuperadoMesActual)}
            sub={
              forecastRecuperacion.pctMeta != null
                ? `${forecastRecuperacion.pctMeta}% de meta mensual`
                : undefined
            }
          />
          <KpiCard
            label="Run-rate diario"
            value={formatearMoneda(forecastRecuperacion.runRateDiario)}
          />
          <KpiCard
            label="Forecast fin de mes"
            value={formatearMoneda(forecastRecuperacion.forecastFinMes)}
            sub="Proyección lineal"
          />
          {forecastRecuperacion.metaMes != null && (
            <KpiCard
              label="Meta del mes"
              value={formatearMoneda(forecastRecuperacion.metaMes)}
            />
          )}
        </div>
      )}

      {kpis && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Saldo en mora"
            value={`${kpis.carteraEnMoraPct}%`}
            sub={`${formatearMoneda(kpis.carteraEnMora)} de cartera`}
          />
          <KpiCard
            label="Tasa de contacto"
            value={`${kpis.tasaContactoPct}%`}
            sub={`${kpis.gestionesMes} gestiones en el mes`}
          />
          <KpiCard
            label="Promesas abiertas"
            value={String(kpis.promesasAbiertas)}
          />
          <KpiCard
            label="Recuperación del mes"
            value={formatearMoneda(kpis.recuperacionMes)}
          />
        </div>
      )}

      {aging && (
        <div>
          <h2 className="mb-3 text-lg font-medium">Aging de cartera</h2>
          <ReporteAgingChart tramos={aging.tramos} />
          <p className="mb-3 text-sm text-gray-500">
            Distribución por días de mora · Saldo total{' '}
            {formatearMoneda(aging.saldoCarteraTotal)} ·{' '}
            {aging.totalPrestamos} préstamos
          </p>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {aging.tramos.map((t) => (
              <div
                key={t.tramo}
                className="rounded-lg border border-stroke p-3 dark:border-dark-3"
              >
                <p className="text-xs text-gray-500">{t.tramo}</p>
                <p className="text-lg font-bold">{t.cantidadPrestamos}</p>
                <p className="text-xs text-gray-500">
                  {formatearMoneda(t.saldoTotal)} ({t.porcentajeSaldo}%)
                </p>
              </div>
            ))}
          </div>
          <ClientPaginatedDataTable
            columns={agingColumns}
            data={aging.tramos}
            emptyMessage="Sin datos de aging."
            itemLabel="tramos"
            initialPageSize={10}
          />
        </div>
      )}

      {reporte && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Préstamos en cartera"
              value={String(reporte.totalPrestamos)}
              sub={`${reporte.prestamosEnMora} en mora`}
            />
            <KpiCard
              label="Cartera total"
              value={formatearMoneda(reporte.saldoCartera)}
            />
            <KpiCard
              label="Recuperado"
              value={formatearMoneda(reporte.totalRecuperado)}
              sub={
                usarPeriodo ? `Periodo ${reporte.periodo ?? periodo}` : 'Histórico'
              }
            />
            <KpiCard
              label="Tasa recuperación"
              value={`${reporte.tasaRecuperacion}%`}
            />
            <KpiCard
              label="Gestiones"
              value={String(reporte.totalGestiones)}
            />
            <KpiCard
              label="Acuerdos vigentes"
              value={String(reporte.totalAcuerdosVigentes)}
            />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-medium">Desempeño por gestor</h2>
            <ClientPaginatedDataTable
              columns={gestorColumns}
              data={reporte.porGestor}
              emptyMessage="Sin gestiones ni pagos en el periodo."
              itemLabel="gestores"
              initialPageSize={10}
            />
          </div>

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
