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
import { GET_REPORTE_CUOTAS_VENCIDAS } from '@/lib/graphql/queries/cobranza.queries';
import {
  formatearMoneda,
  type ReporteCuotasVencidas,
  type ReporteCuotaVencidaItem,
} from '@/types/cobranza';
import { exportReporteCuotasVencidasXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  
  
  const mandanteId = idmandante === '' ? 0 : idmandante;
  

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteCuotasVencidas: ReporteCuotasVencidas;
  }>(
    GET_REPORTE_CUOTAS_VENCIDAS,
    { idmandante: mandanteId },
    { enabled: mandanteId > 0 },
  );

  const [exportOk, setExportOk] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const reporte = data?.reporteCuotasVencidas;

  const columns = useMemo<ColumnDef<ReporteCuotaVencidaItem>[]>(
    () => [
      { accessorKey: 'noPrestamo', header: 'Préstamo' },
      { accessorKey: 'nombreCliente', header: 'Cliente' },
      { accessorKey: 'nombreGestor', header: 'Gestor', cell: ({ row }) => row.original.nombreGestor ?? '—' },
      { accessorKey: 'numeroCuota', header: 'Cuota' },
      { accessorKey: 'montoCuota', header: 'Monto', cell: ({ row }) => formatearMoneda(row.original.montoCuota) },
      { accessorKey: 'fechaVencimiento', header: 'Vence' },
      { accessorKey: 'diasVencidos', header: 'Días' },
      { accessorKey: 'estadoAcuerdo', header: 'Acuerdo' },
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
      exportReporteCuotasVencidasXlsx(reporte);
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
      { label: 'Cuotas', value: String(r.totalCuotas), tone: 'danger' },
      { label: 'Monto', value: formatearMoneda(r.montoTotal) },
    ];
  }, [reporte]);

  return (
    <div className="space-y-4">
      <PageHeader title="Cuotas vencidas de acuerdos" description="Cuotas en estado VENCIDA pendientes de gestión." />
      <div className="space-y-3 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex flex-wrap items-end gap-3">
          <MandanteSelect
            value={idmandante}
            onChange={(v) => setIdmandante(v)}
            required
          />
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
                data={reporte.cuotas}
                emptyMessage="Sin cuotas vencidas."
                itemLabel="cuotas"
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
