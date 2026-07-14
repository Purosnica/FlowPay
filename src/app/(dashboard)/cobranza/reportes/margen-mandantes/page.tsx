'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ClientPaginatedDataTable } from '@/components/cobranza/client-paginated-data-table';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { AsyncPanel } from '@/components/ui/async-panel';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_REPORTE_MARGEN_MANDANTES } from '@/lib/graphql/queries/cobranza.queries';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteMargenMandantes,
  type ReporteMargenMandanteItem,
} from '@/types/cobranza';

export default function Page() {
  
  const [periodo, setPeriodo] = useState(periodoActual());
  
  
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteMargenMandantes: ReporteMargenMandantes;
  }>(
    GET_REPORTE_MARGEN_MANDANTES,
    { periodo },
    { enabled: periodoValido },
  );

  const reporte = data?.reporteMargenMandantes;

  const columns = useMemo<ColumnDef<ReporteMargenMandanteItem>[]>(
    () => [
      { accessorKey: 'mandanteNombre', header: 'Mandante' },
      { accessorKey: 'cantidadPagos', header: 'Pagos' },
      { accessorKey: 'totalRecuperado', header: 'Recuperado', cell: ({ row }) => formatearMoneda(row.original.totalRecuperado) },
      { accessorKey: 'totalIngresoEmpresa', header: 'Ingreso', cell: ({ row }) => formatearMoneda(row.original.totalIngresoEmpresa) },
      { accessorKey: 'totalComision', header: 'Comisión', cell: ({ row }) => formatearMoneda(row.original.totalComision) },
      { accessorKey: 'gananciaNeta', header: 'Ganancia neta', cell: ({ row }) => formatearMoneda(row.original.gananciaNeta) },
      { accessorKey: 'margenPct', header: 'Margen %', cell: ({ row }) => `${row.original.margenPct}%` },
    ],
    [],
  );

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    const r = reporte;
    return [
      { label: 'Recuperado', value: formatearMoneda(r.totalRecuperado) },
      { label: 'Ingreso', value: formatearMoneda(r.totalIngresoEmpresa), tone: 'primary' },
      { label: 'Ganancia neta', value: formatearMoneda(r.gananciaNeta), tone: 'success' },
      { label: 'Margen', value: `${r.margenPct}%` },
    ];
  }, [reporte]);

  return (
    <div className="space-y-4">
      <PageHeader title="Margen por mandante" description="Comparativo de ingreso, comisión y ganancia neta entre mandantes." />
      <div className="space-y-3 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="periodo-margen-mandantes" className="mb-1 block text-sm font-medium">Periodo</label>
            <input
              id="periodo-margen-mandantes"
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
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
        </div>
      </div>
      {(
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
                data={reporte.porMandante}
                emptyMessage="Sin datos de mandantes."
                itemLabel="mandantes"
                initialPageSize={25}
              />
            </div>
          ) : null}
        </AsyncPanel>
      )}
    </div>
  );
}
