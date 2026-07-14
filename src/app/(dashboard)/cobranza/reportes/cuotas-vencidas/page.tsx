'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ReporteFiltrosBar } from '@/components/cobranza/reporte-filtros-bar';
import { ReporteTableSection } from '@/components/cobranza/reporte-table-section';
import {
  cellEstadoBadge,
  cellMoneda,
  cellMoraDias,
  cellNumero,
  cellTexto,
} from '@/components/cobranza/reporte-table-cells';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { ReporteAsyncContent } from '@/components/cobranza/reporte-async-content';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useReporteExportFeedback } from '@/hooks/use-reporte-export-feedback';
import { GET_REPORTE_CUOTAS_VENCIDAS } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteCuotasVencidasXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';
import {
  formatearMoneda,
  type ReporteCuotasVencidas,
  type ReporteCuotaVencidaItem,
} from '@/types/cobranza';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteCuotasVencidas: ReporteCuotasVencidas;
  }>(
    GET_REPORTE_CUOTAS_VENCIDAS,
    { idmandante: mandanteId },
    { enabled: mandanteId > 0 },
  );

  const reporte = data?.reporteCuotasVencidas;

  const columns = useMemo<ColumnDef<ReporteCuotaVencidaItem>[]>(
    () => [
      { accessorKey: 'noPrestamo', header: 'Préstamo' },
      { accessorKey: 'nombreCliente', header: 'Cliente' },
      {
        accessorKey: 'nombreGestor',
        header: 'Gestor',
        cell: ({ row }) => cellTexto(row.original.nombreGestor),
      },
      {
        accessorKey: 'numeroCuota',
        header: 'Cuota',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.numeroCuota),
      },
      {
        accessorKey: 'montoCuota',
        header: 'Monto',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.montoCuota),
      },
      { accessorKey: 'fechaVencimiento', header: 'Vence' },
      {
        accessorKey: 'diasVencidos',
        header: 'Días',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoraDias(row.original.diasVencidos),
      },
      {
        accessorKey: 'estadoAcuerdo',
        header: 'Acuerdo',
        cell: ({ row }) => cellEstadoBadge(row.original.estadoAcuerdo),
      },
    ],
    [],
  );

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
    <div className="space-y-6">
      <PageHeader
        title="Cuotas vencidas de acuerdos"
        description="Cuotas en estado VENCIDA pendientes de gestión."
      />

      <ReporteFiltrosBar
        idmandante={idmandante}
        onMandanteChange={(v) => {
          clearFeedback();
          setIdmandante(v);
        }}
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReporteCuotasVencidasXlsx(reporte));
        }}
      />

      {mandanteId === 0 ? (
        <p className="text-sm text-gray-5">
          Seleccione un mandante para generar el reporte.
        </p>
      ) : (
        <ReporteAsyncContent
          isLoading={isLoading}
          error={error}
          hasData={Boolean(reporte)}
        >
          {reporte ? (
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                  Indicadores
                </h2>
                <DashboardMetricStrip metrics={metrics} />
              </div>
              <ReporteTableSection
                title="Cuotas vencidas"
                description="Cuotas de acuerdos en estado vencida"
                columns={columns}
                data={reporte.cuotas}
                emptyMessage="Sin cuotas vencidas."
                itemLabel="cuotas"
                initialPageSize={20}
                resetKey={mandanteId}
              />
            </div>
          ) : null}
        </ReporteAsyncContent>
      )}
    </div>
  );
}
