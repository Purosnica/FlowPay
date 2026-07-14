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
import { GET_REPORTE_PROMESAS_PAGO } from '@/lib/graphql/queries/cobranza.queries';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReportePromesasPago,
  type ReportePromesaPagoItem,
} from '@/types/cobranza';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  
  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reportePromesasPago: ReportePromesasPago;
  }>(
    GET_REPORTE_PROMESAS_PAGO,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reportePromesasPago;

  const columns = useMemo<ColumnDef<ReportePromesaPagoItem>[]>(
    () => [
      { accessorKey: 'noPrestamo', header: 'Préstamo' },
      { accessorKey: 'nombreCliente', header: 'Cliente' },
      { accessorKey: 'nombreGestor', header: 'Gestor', cell: ({ row }) => row.original.nombreGestor ?? '—' },
      { accessorKey: 'montoPromesa', header: 'Monto', cell: ({ row }) => formatearMoneda(row.original.montoPromesa) },
      { accessorKey: 'fechaPromesa', header: 'Fecha' },
      { accessorKey: 'estado', header: 'Estado' },
      { accessorKey: 'diasVencidos', header: 'Días venc.', cell: ({ row }) => row.original.diasVencidos ?? '—' },
    ],
    [],
  );

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    const r = reporte;
    return [
      { label: 'Promesas', value: String(r.totalPromesas), sub: `${r.pendientes} pendientes` },
      { label: 'Cumplidas', value: String(r.cumplidas), tone: 'success' },
      { label: 'Vencidas', value: String(r.vencidas), tone: 'danger' },
      { label: 'Cumplimiento', value: `${r.cumplimientoPct}%` },
    ];
  }, [reporte]);

  return (
    <div className="space-y-4">
      <PageHeader title="Promesas de pago" description="Cumplimiento de promesas: cumplidas, vencidas y pendientes." />
      <div className="space-y-3 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex flex-wrap items-end gap-3">
          <MandanteSelect
            value={idmandante}
            onChange={(v) => setIdmandante(v)}
            required
          />
          <div>
            <label htmlFor="periodo-promesas-pago" className="mb-1 block text-sm font-medium">Periodo</label>
            <input
              id="periodo-promesas-pago"
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
                data={reporte.promesas}
                emptyMessage="Sin promesas en el periodo."
                itemLabel="promesas"
                initialPageSize={25}
              />
            </div>
          ) : null}
        </AsyncPanel>
      )}
    </div>
  );
}
