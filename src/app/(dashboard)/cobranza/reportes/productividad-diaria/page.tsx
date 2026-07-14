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
import { GET_REPORTE_PRODUCTIVIDAD_DIARIA } from '@/lib/graphql/queries/cobranza.queries';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteProductividadDiaria,
  type ReporteProductividadGestorResumen,
  type ReporteProductividadDiaItem,
} from '@/types/cobranza';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  
  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteProductividadDiaria: ReporteProductividadDiaria;
  }>(
    GET_REPORTE_PRODUCTIVIDAD_DIARIA,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteProductividadDiaria;

  const columns = useMemo<ColumnDef<ReporteProductividadGestorResumen>[]>(
    () => [
      { accessorKey: 'nombreGestor', header: 'Cobrador' },
      { accessorKey: 'diasActivos', header: 'Días activos' },
      { accessorKey: 'totalGestiones', header: 'Gestiones' },
      { accessorKey: 'promedioGestionesDia', header: 'Promedio/día' },
      { accessorKey: 'totalRecuperado', header: 'Recuperado', cell: ({ row }) => formatearMoneda(row.original.totalRecuperado) },
    ],
    [],
  );

  const secondaryColumns = useMemo<ColumnDef<ReporteProductividadDiaItem>[]>(
    () => [
      { accessorKey: 'fecha', header: 'Fecha' },
      { accessorKey: 'nombreGestor', header: 'Cobrador' },
      { accessorKey: 'gestiones', header: 'Gestiones' },
      { accessorKey: 'gestionesEfectivas', header: 'Efectivas' },
      { accessorKey: 'montoRecuperado', header: 'Recuperado', cell: ({ row }) => formatearMoneda(row.original.montoRecuperado) },
    ],
    [],
  );

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    const r = reporte;
    return [
      { label: 'Gestiones', value: String(r.totalGestiones) },
      { label: 'Promedio/día', value: String(r.promedioGestionesDia) },
    ];
  }, [reporte]);

  return (
    <div className="space-y-4">
      <PageHeader title="Productividad diaria" description="Gestiones y recuperación por día y cobrador." />
      <div className="space-y-3 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex flex-wrap items-end gap-3">
          <MandanteSelect
            value={idmandante}
            onChange={(v) => setIdmandante(v)}
            required
          />
          <div>
            <label htmlFor="periodo-productividad-diaria" className="mb-1 block text-sm font-medium">Periodo</label>
            <input
              id="periodo-productividad-diaria"
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
                data={reporte.porGestor}
                emptyMessage="Sin actividad."
                itemLabel="cobradores"
                initialPageSize={25}
              />
              <ClientPaginatedDataTable
                columns={secondaryColumns}
                data={reporte.porDia}
                emptyMessage="Sin detalle diario."
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
