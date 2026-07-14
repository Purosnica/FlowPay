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
import { GET_REPORTE_RECLAMOS_SLA } from '@/lib/graphql/queries/cobranza.queries';
import {
  formatearMoneda,
  type ReporteReclamosSla,
  type ReporteReclamoSlaItem,
} from '@/types/cobranza';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  
  
  const mandanteId = idmandante === '' ? 0 : idmandante;
  

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteReclamosSla: ReporteReclamosSla;
  }>(
    GET_REPORTE_RECLAMOS_SLA,
    { idmandante: mandanteId },
    { enabled: mandanteId > 0 },
  );

  const reporte = data?.reporteReclamosSla;

  const columns = useMemo<ColumnDef<ReporteReclamoSlaItem>[]>(
    () => [
      { accessorKey: 'idreclamo', header: 'ID' },
      { accessorKey: 'nombreCliente', header: 'Cliente' },
      { accessorKey: 'noPrestamo', header: 'Préstamo', cell: ({ row }) => row.original.noPrestamo ?? '—' },
      { accessorKey: 'estado', header: 'Estado' },
      { accessorKey: 'fechaLimite', header: 'Límite' },
      { accessorKey: 'fueraSla', header: 'Fuera SLA', cell: ({ row }) => (row.original.fueraSla ? 'Sí' : 'No') },
      { accessorKey: 'diasFueraSla', header: 'Días fuera', cell: ({ row }) => row.original.diasFueraSla ?? '—' },
      { accessorKey: 'descripcion', header: 'Descripción' },
    ],
    [],
  );

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    const r = reporte;
    return [
      { label: 'Total', value: String(r.totalReclamos) },
      { label: 'Abiertos', value: String(r.abiertos) },
      { label: 'En proceso', value: String(r.enProceso) },
      { label: 'Fuera SLA', value: String(r.fueraSla), tone: 'danger', sub: `${r.pctFueraSla}%` },
    ];
  }, [reporte]);

  return (
    <div className="space-y-4">
      <PageHeader title="SLA de reclamos" description="Reclamos abiertos, en proceso y fuera de SLA." />
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
                data={reporte.reclamos}
                emptyMessage="Sin reclamos."
                itemLabel="reclamos"
                initialPageSize={25}
              />
            </div>
          ) : null}
        </AsyncPanel>
      )}
    </div>
  );
}
