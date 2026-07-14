'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ClientPaginatedDataTable } from '@/components/cobranza/client-paginated-data-table';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { AsyncPanel } from '@/components/ui/async-panel';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_REPORTE_COMISIONES_COBRADORES } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteComisionesCsv } from '@/lib/cobranza/export-reportes-control-csv';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteComisionCobradorItem,
  type ReporteComisionesCobradores,
} from '@/types/cobranza';

export default function ReporteComisionesCobradoresPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [filtrarPeriodo, setFiltrarPeriodo] = useState(true);
  const [exportOk, setExportOk] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteComisionesCobradores: ReporteComisionesCobradores;
  }>(
    GET_REPORTE_COMISIONES_COBRADORES,
    {
      idmandante: mandanteId,
      periodo: filtrarPeriodo ? periodo : null,
    },
    {
      enabled:
        mandanteId > 0 && (!filtrarPeriodo || periodoValido),
    },
  );

  const reporte = data?.reporteComisionesCobradores;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      {
        label: 'Comisión total',
        value: formatearMoneda(reporte.totalComision),
        sub: `${reporte.cantidadLiquidaciones} liquidaciones`,
      },
      {
        label: 'Borrador',
        value: formatearMoneda(reporte.totalComisionBorrador),
      },
      {
        label: 'Por pagar (emitida)',
        value: formatearMoneda(reporte.totalComisionEmitida),
        tone: 'warning',
      },
      {
        label: 'Pagada',
        value: formatearMoneda(reporte.totalComisionPagada),
        tone: 'success',
      },
    ];
  }, [reporte]);

  const columns = useMemo<ColumnDef<ReporteComisionCobradorItem>[]>(
    () => [
      { accessorKey: 'periodo', header: 'Periodo' },
      { accessorKey: 'idliquidacion', header: 'Liquidación' },
      { accessorKey: 'estado', header: 'Estado' },
      { accessorKey: 'nombreGestor', header: 'Cobrador' },
      { accessorKey: 'cantidadPagos', header: 'Pagos' },
      {
        accessorKey: 'totalRecuperado',
        header: 'Recuperado',
        cell: ({ row }) => formatearMoneda(row.original.totalRecuperado),
      },
      {
        accessorKey: 'totalIngresoEmpresa',
        header: 'Ingreso empresa',
        cell: ({ row }) => formatearMoneda(row.original.totalIngresoEmpresa),
      },
      {
        accessorKey: 'totalComision',
        header: 'Comisión',
        cell: ({ row }) => formatearMoneda(row.original.totalComision),
      },
    ],
    [],
  );

  function clearFeedback(): void {
    setExportOk(null);
    setExportError(null);
  }

  function handleExport(): void {
    if (!reporte) {
      return;
    }
    clearFeedback();
    try {
      exportReporteComisionesCsv(reporte);
      setExportOk('Reporte de comisiones exportado.');
    } catch {
      setExportError('No se pudo exportar el reporte.');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Comisiones a cobradores"
        description="Pagos de comisión por liquidación: borrador, emitida (por pagar) y pagada."
      />

      <div className="space-y-3 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex flex-wrap items-end gap-3">
          <MandanteSelect
            value={idmandante}
            onChange={(v) => {
              clearFeedback();
              setIdmandante(v);
            }}
            required
          />
          <div>
            <label
              htmlFor="periodo-comisiones"
              className="mb-1 block text-sm font-medium"
            >
              Periodo
            </label>
            <input
              id="periodo-comisiones"
              type="month"
              value={periodo}
              disabled={!filtrarPeriodo}
              onChange={(e) => {
                clearFeedback();
                setPeriodo(e.target.value);
              }}
              className="rounded-md border border-stroke bg-transparent px-3 py-2 text-sm disabled:opacity-50 dark:border-dark-3"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filtrarPeriodo}
              onChange={(e) => {
                clearFeedback();
                setFiltrarPeriodo(e.target.checked);
              }}
            />
            Filtrar por periodo
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={!reporte || isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? 'Actualizando…' : 'Actualizar'}
          </Button>
          <Button type="button" disabled={!reporte} onClick={handleExport}>
            Exportar CSV
          </Button>
        </div>
        {exportOk ? (
          <p className="text-sm text-green-700 dark:text-green-400" role="status">
            {exportOk}
          </p>
        ) : null}
        {exportError ? (
          <p className="text-sm text-red-600" role="alert">
            {exportError}
          </p>
        ) : null}
      </div>

      {mandanteId === 0 ? (
        <p className="text-sm text-dark-5 dark:text-dark-6">
          Seleccione un mandante para ver las comisiones.
        </p>
      ) : (
        <AsyncPanel
          isLoading={isLoading}
          error={error}
          isEmpty={!reporte}
          emptyMessage="No se pudo cargar el reporte de comisiones."
        >
          {reporte ? (
            <div className="space-y-4">
              <DashboardMetricStrip metrics={metrics} />
              <ClientPaginatedDataTable
                columns={columns}
                data={reporte.porCobrador}
                emptyMessage="Sin liquidaciones para el filtro seleccionado."
                itemLabel="filas"
                initialPageSize={25}
              />
            </div>
          ) : null}
        </AsyncPanel>
      )}
    </div>
  );
}
