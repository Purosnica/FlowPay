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
import { GET_REPORTE_CUMPLIMIENTO_METAS } from '@/lib/graphql/queries/cobranza.queries';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteCumplimientoMetas,
  type ReporteCumplimientoMetaItem,
} from '@/types/cobranza';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  
  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteCumplimientoMetas: ReporteCumplimientoMetas;
  }>(
    GET_REPORTE_CUMPLIMIENTO_METAS,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteCumplimientoMetas;

  const columns = useMemo<ColumnDef<ReporteCumplimientoMetaItem>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Cobrador' },
      { accessorKey: 'recuperadoMes', header: 'Recuperado', cell: ({ row }) => formatearMoneda(row.original.recuperadoMes) },
      { accessorKey: 'metaRecuperacionMes', header: 'Meta recup.', cell: ({ row }) => formatearMoneda(row.original.metaRecuperacionMes) },
      { accessorKey: 'pctMetaRecuperacion', header: '% recup.', cell: ({ row }) => `${row.original.pctMetaRecuperacion}%` },
      { accessorKey: 'gestionesSemana', header: 'Gest. semana' },
      { accessorKey: 'metaGestionesSemana', header: 'Meta gest.' },
      { accessorKey: 'pctMetaGestiones', header: '% gest.', cell: ({ row }) => `${row.original.pctMetaGestiones}%` },
    ],
    [],
  );

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    const r = reporte;
    return [
      { label: 'Meta mandante', value: formatearMoneda(r.metaRecuperacionMandante) },
      { label: 'Recuperado', value: formatearMoneda(r.recuperadoMandante), tone: 'primary' },
      { label: '% meta', value: `${r.pctMetaMandante}%` },
    ];
  }, [reporte]);

  return (
    <div className="space-y-4">
      <PageHeader title="Cumplimiento de metas" description="Meta vs recuperación/gestiones por cobrador." />
      <div className="space-y-3 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex flex-wrap items-end gap-3">
          <MandanteSelect
            value={idmandante}
            onChange={(v) => setIdmandante(v)}
            required
          />
          <div>
            <label htmlFor="periodo-cumplimiento-metas" className="mb-1 block text-sm font-medium">Periodo</label>
            <input
              id="periodo-cumplimiento-metas"
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
                data={reporte.cobradores}
                emptyMessage="Sin cobradores en el equipo."
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
