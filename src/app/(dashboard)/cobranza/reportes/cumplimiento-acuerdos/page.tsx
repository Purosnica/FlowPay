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
import { GET_REPORTE_CUMPLIMIENTO_ACUERDOS } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteCumplimientoCsv } from '@/lib/cobranza/export-reportes-control-csv';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteCumplimientoAcuerdoItem,
  type ReporteCumplimientoAcuerdos,
} from '@/types/cobranza';

export default function ReporteCumplimientoAcuerdosPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [exportOk, setExportOk] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteCumplimientoAcuerdos: ReporteCumplimientoAcuerdos;
  }>(
    GET_REPORTE_CUMPLIMIENTO_ACUERDOS,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteCumplimientoAcuerdos;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      {
        label: 'Acuerdos',
        value: String(reporte.totalAcuerdos),
        sub: `${reporte.vigentes} vigentes`,
      },
      {
        label: 'Cumplidos',
        value: String(reporte.cumplidos),
        tone: 'success',
      },
      {
        label: 'Rotos',
        value: String(reporte.rotos),
        tone: reporte.rotos > 0 ? 'danger' : 'default',
      },
      {
        label: 'Cumplimiento',
        value: `${reporte.cumplimientoPct}%`,
        sub: `${formatearMoneda(reporte.montoCumplido)} de ${formatearMoneda(reporte.montoAcordadoTotal)}`,
      },
    ];
  }, [reporte]);

  const columns = useMemo<ColumnDef<ReporteCumplimientoAcuerdoItem>[]>(
    () => [
      { accessorKey: 'noPrestamo', header: 'N° Préstamo' },
      { accessorKey: 'nombreCliente', header: 'Cliente' },
      {
        accessorKey: 'nombreGestor',
        header: 'Gestor',
        cell: ({ row }) => row.original.nombreGestor ?? '—',
      },
      { accessorKey: 'estado', header: 'Estado' },
      {
        accessorKey: 'montoAcordado',
        header: 'Monto',
        cell: ({ row }) => formatearMoneda(row.original.montoAcordado),
      },
      { accessorKey: 'numeroCuotas', header: 'Cuotas' },
      { accessorKey: 'cuotasPagadas', header: 'Pagadas' },
      { accessorKey: 'cuotasPendientes', header: 'Pendientes' },
      { accessorKey: 'cuotasVencidas', header: 'Vencidas' },
      { accessorKey: 'fechaInicio', header: 'Inicio' },
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
      exportReporteCumplimientoCsv(reporte);
      setExportOk('Reporte de cumplimiento exportado.');
    } catch {
      setExportError('No se pudo exportar el reporte.');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cumplimiento de acuerdos"
        description="Acuerdos del periodo: vigentes, cumplidos, rotos y avance de cuotas."
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
              htmlFor="periodo-cumplimiento"
              className="mb-1 block text-sm font-medium"
            >
              Periodo
            </label>
            <input
              id="periodo-cumplimiento"
              type="month"
              value={periodo}
              onChange={(e) => {
                clearFeedback();
                setPeriodo(e.target.value);
              }}
              className="rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3"
            />
          </div>
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
          Seleccione un mandante y el periodo para generar el reporte.
        </p>
      ) : (
        <AsyncPanel
          isLoading={isLoading}
          error={error}
          isEmpty={!reporte}
          emptyMessage="No se pudo cargar el reporte de cumplimiento."
        >
          {reporte ? (
            <div className="space-y-4">
              <DashboardMetricStrip metrics={metrics} />
              <ClientPaginatedDataTable
                columns={columns}
                data={reporte.acuerdos}
                emptyMessage="Sin acuerdos creados en el periodo."
                itemLabel="acuerdos"
                initialPageSize={25}
              />
            </div>
          ) : null}
        </AsyncPanel>
      )}
    </div>
  );
}
