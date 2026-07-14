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
import { GET_REPORTE_CONCENTRACION_RIESGO } from '@/lib/graphql/queries/cobranza.queries';
import {
  formatearMoneda,
  type ReporteConcentracionRiesgo,
  type ReporteConcentracionItem,
} from '@/types/cobranza';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  
  
  const mandanteId = idmandante === '' ? 0 : idmandante;
  

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteConcentracionRiesgo: ReporteConcentracionRiesgo;
  }>(
    GET_REPORTE_CONCENTRACION_RIESGO,
    { idmandante: mandanteId },
    { enabled: mandanteId > 0 },
  );

  const reporte = data?.reporteConcentracionRiesgo;

  const columns = useMemo<ColumnDef<ReporteConcentracionItem>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Deudor' },
      { accessorKey: 'cantidadPrestamos', header: 'Préstamos' },
      { accessorKey: 'saldoMora', header: 'Saldo', cell: ({ row }) => formatearMoneda(row.original.saldoMora) },
      { accessorKey: 'shareSaldoPct', header: 'Share %', cell: ({ row }) => `${row.original.shareSaldoPct}%` },
    ],
    [],
  );

  const secondaryColumns = useMemo<ColumnDef<ReporteConcentracionItem>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Gestor' },
      { accessorKey: 'cantidadPrestamos', header: 'Préstamos' },
      { accessorKey: 'saldoMora', header: 'Saldo', cell: ({ row }) => formatearMoneda(row.original.saldoMora) },
      { accessorKey: 'shareSaldoPct', header: 'Share %', cell: ({ row }) => `${row.original.shareSaldoPct}%` },
    ],
    [],
  );

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    const r = reporte;
    return [
      { label: 'Saldo en mora', value: formatearMoneda(r.saldoMoraTotal), tone: 'warning' },
    ];
  }, [reporte]);

  return (
    <div className="space-y-4">
      <PageHeader title="Concentración de riesgo" description="Top deudores y gestores por saldo en mora." />
      <div className="space-y-3 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex flex-wrap items-end gap-3">
          <MandanteSelect
            value={idmandante}
            onChange={(v) => setIdmandante(v)}
            required
          />
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
                data={reporte.topDeudores}
                emptyMessage="Sin cartera en mora."
                itemLabel="deudores"
                initialPageSize={25}
              />
              <ClientPaginatedDataTable
                columns={secondaryColumns}
                data={reporte.topGestores}
                emptyMessage="Sin gestores."
                itemLabel="gestores"
                initialPageSize={25}
              />
            </div>
          ) : null}
        </AsyncPanel>
      )}
    </div>
  );
}
