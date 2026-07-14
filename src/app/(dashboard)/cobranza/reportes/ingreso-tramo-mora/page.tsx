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
import { GET_REPORTE_INGRESO_TRAMO_MORA } from '@/lib/graphql/queries/cobranza.queries';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteIngresoTramoMora,
  type ReporteIngresoTramoItem,
} from '@/types/cobranza';
import { exportReporteIngresoTramoMoraXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  
  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteIngresoTramoMora: ReporteIngresoTramoMora;
  }>(
    GET_REPORTE_INGRESO_TRAMO_MORA,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const [exportOk, setExportOk] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const reporte = data?.reporteIngresoTramoMora;

  const columns = useMemo<ColumnDef<ReporteIngresoTramoItem>[]>(
    () => [
      { accessorKey: 'tramo', header: 'Tramo' },
      { accessorKey: 'cantidadPagos', header: 'Pagos' },
      { accessorKey: 'totalRecuperado', header: 'Recuperado', cell: ({ row }) => formatearMoneda(row.original.totalRecuperado) },
      { accessorKey: 'totalIngresoEmpresa', header: 'Ingreso', cell: ({ row }) => formatearMoneda(row.original.totalIngresoEmpresa) },
      { accessorKey: 'margenPct', header: 'Margen %', cell: ({ row }) => `${row.original.margenPct}%` },
      { accessorKey: 'shareIngresoPct', header: 'Share %', cell: ({ row }) => `${row.original.shareIngresoPct}%` },
    ],
    [],
  );

  function handleExport(): void {
    if (!reporte) {
      return;
    }
    setExportOk(null);
    setExportError(null);
    try {
      exportReporteIngresoTramoMoraXlsx(reporte);
      setExportOk('Archivo Excel descargado.');
    } catch {
      setExportError('No se pudo exportar el reporte.');
    }
  }

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    const r = reporte;
    return [
      { label: 'Ingreso empresa', value: formatearMoneda(r.totalIngresoEmpresa), tone: 'primary' },
      { label: 'Comisiones', value: formatearMoneda(r.totalComision) },
      { label: 'Ganancia neta', value: formatearMoneda(r.gananciaNeta), tone: 'success' },
    ];
  }, [reporte]);

  return (
    <div className="space-y-4">
      <PageHeader title="Ingreso por tramo de mora" description="Rentabilidad y share de ingreso por tramo de mora." />
      <div className="space-y-3 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex flex-wrap items-end gap-3">
          <MandanteSelect
            value={idmandante}
            onChange={(v) => setIdmandante(v)}
            required
          />
          <div>
            <label htmlFor="periodo-ingreso-tramo-mora" className="mb-1 block text-sm font-medium">Periodo</label>
            <input
              id="periodo-ingreso-tramo-mora"
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3"
            />
          </div>
          <Button
            type="button"
            disabled={!reporte}
            onClick={handleExport}
          >
            Exportar Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!reporte || isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? 'Actualizando…' : 'Actualizar'}
          </Button>
        </div>
      </div>
      {mandanteId === 0 ? (
        <p className="text-sm text-dark-5 dark:text-dark-6">
          Seleccione un mandante.
        </p>
      ) : (
        <>
          {exportError ? (
            <p className="text-sm text-red-600" role="alert">
              {exportError}
            </p>
          ) : null}
          {exportOk ? (
            <p className="text-sm text-green-600" role="status">
              {exportOk}
            </p>
          ) : null}
          <AsyncPanel
          isLoading={isLoading}
          error={error}
          isEmpty={!reporte}
          emptyMessage="No se pudo cargar el reporte."
        >
          {reporte ? (
            <div className="space-y-4">
              <DashboardMetricStrip metrics={metrics} />

              <ClientPaginatedDataTable
                columns={columns}
                data={reporte.porTramo}
                emptyMessage="Sin pagos en el periodo."
                itemLabel="tramos"
                initialPageSize={25}
              />
            </div>
          ) : null}
        </AsyncPanel>
        </>
      )}
    </div>
  );
}
