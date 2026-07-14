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
import { GET_REPORTE_EFECTIVIDAD } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteEfectividadXlsx } from '@/lib/cobranza/export-reportes-control-xlsx';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteEfectividad,
  type ReporteEfectividadGestorItem,
} from '@/types/cobranza';

export default function ReporteEfectividadPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [exportOk, setExportOk] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteEfectividad: ReporteEfectividad;
  }>(
    GET_REPORTE_EFECTIVIDAD,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteEfectividad;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      {
        label: 'Gestiones',
        value: String(reporte.totalGestiones),
        sub: `${reporte.totalGestionesEfectivas} efectivas`,
      },
      {
        label: 'Efectividad',
        value: `${reporte.efectividadPct}%`,
        tone:
          reporte.efectividadPct >= 40
            ? 'success'
            : reporte.efectividadPct > 0
              ? 'warning'
              : 'default',
      },
      {
        label: 'Tasa de contacto',
        value: `${reporte.tasaContactoPct}%`,
      },
      {
        label: 'Recuperado',
        value: formatearMoneda(reporte.totalRecuperado),
        tone: 'primary',
      },
    ];
  }, [reporte]);

  const columns = useMemo<ColumnDef<ReporteEfectividadGestorItem>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Cobrador' },
      { accessorKey: 'gestiones', header: 'Gestiones' },
      { accessorKey: 'gestionesEfectivas', header: 'Efectivas' },
      {
        accessorKey: 'efectividadPct',
        header: 'Efectividad %',
        cell: ({ row }) => `${row.original.efectividadPct}%`,
      },
      {
        accessorKey: 'tasaContactoPct',
        header: 'Contacto %',
        cell: ({ row }) => `${row.original.tasaContactoPct}%`,
      },
      {
        accessorKey: 'montoRecuperado',
        header: 'Recuperado',
        cell: ({ row }) => formatearMoneda(row.original.montoRecuperado),
      },
      { accessorKey: 'prestamosAsignados', header: 'Asignados' },
      { accessorKey: 'prestamosEnMora', header: 'En mora' },
      {
        accessorKey: 'saldoAsignado',
        header: 'Saldo',
        cell: ({ row }) => formatearMoneda(row.original.saldoAsignado),
      },
      {
        accessorKey: 'recuperacionPct',
        header: 'Recuperación %',
        cell: ({ row }) => `${row.original.recuperacionPct}%`,
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
      exportReporteEfectividadXlsx(reporte);
      setExportOk('Archivo Excel descargado.');
    } catch {
      setExportError('No se pudo exportar el reporte.');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reporte de efectividad"
        description="Conversión operativa por cobrador: gestiones, contacto, recuperación y cartera."
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
              htmlFor="periodo-efectividad"
              className="mb-1 block text-sm font-medium"
            >
              Periodo
            </label>
            <input
              id="periodo-efectividad"
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
            Exportar Excel
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
          emptyMessage="No se pudo cargar el reporte de efectividad."
        >
          {reporte ? (
            <div className="space-y-4">
              <DashboardMetricStrip metrics={metrics} />
              <ClientPaginatedDataTable
                columns={columns}
                data={reporte.porGestor}
                emptyMessage="Sin actividad de cobradores en el periodo."
                itemLabel="cobradores"
                initialPageSize={25}
              />
            </div>
          ) : null}
        </AsyncPanel>
      )}
    </div>
  );
}
