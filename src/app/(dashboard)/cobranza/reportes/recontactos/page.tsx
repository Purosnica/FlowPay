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
import { GET_REPORTE_RECONTACTOS } from '@/lib/graphql/queries/cobranza.queries';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteRecontactos,
  type ReporteRecontactoItem,
} from '@/types/cobranza';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [minGestiones, setMinGestiones] = useState(3);
  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteRecontactos: ReporteRecontactos;
  }>(
    GET_REPORTE_RECONTACTOS,
    { idmandante: mandanteId, periodo, minGestiones },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteRecontactos;

  const columns = useMemo<ColumnDef<ReporteRecontactoItem>[]>(
    () => [
      { accessorKey: 'noPrestamo', header: 'Préstamo' },
      { accessorKey: 'nombreCliente', header: 'Cliente' },
      { accessorKey: 'nombreGestor', header: 'Gestor', cell: ({ row }) => row.original.nombreGestor ?? '—' },
      { accessorKey: 'gestionesPeriodo', header: 'Gestiones' },
      { accessorKey: 'diasMora', header: 'Mora' },
      { accessorKey: 'saldoTotal', header: 'Saldo', cell: ({ row }) => formatearMoneda(row.original.saldoTotal) },
      { accessorKey: 'ultimaGestion', header: 'Última gestión', cell: ({ row }) => row.original.ultimaGestion ?? '—' },
    ],
    [],
  );

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    const r = reporte;
    return [
      { label: 'Préstamos', value: String(r.totalPrestamos), tone: 'warning' },
      { label: 'Saldo', value: formatearMoneda(r.saldoTotal) },
      { label: 'Umbral gestiones', value: String(r.minGestiones) },
    ];
  }, [reporte]);

  return (
    <div className="space-y-4">
      <PageHeader title="Recontactos sin pago" description="Préstamos con muchas gestiones y sin pago aplicado." />
      <div className="space-y-3 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex flex-wrap items-end gap-3">
          <MandanteSelect
            value={idmandante}
            onChange={(v) => setIdmandante(v)}
            required
          />
          <div>
            <label htmlFor="periodo-recontactos" className="mb-1 block text-sm font-medium">Periodo</label>
            <input
              id="periodo-recontactos"
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3"
            />
          </div>
          <div>
            <label htmlFor="min-gest-recontactos" className="mb-1 block text-sm font-medium">Mín. gestiones</label>
            <select
              id="min-gest-recontactos"
              value={minGestiones}
              onChange={(e) => setMinGestiones(Number(e.target.value))}
              className="rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3"
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={8}>8</option>
            </select>
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
                data={reporte.prestamos}
                emptyMessage="Sin recontactos en el umbral."
                itemLabel="préstamos"
                initialPageSize={25}
              />
            </div>
          ) : null}
        </AsyncPanel>
      )}
    </div>
  );
}
