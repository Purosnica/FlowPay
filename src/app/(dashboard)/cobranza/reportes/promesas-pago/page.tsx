'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ReporteFiltrosBar } from '@/components/cobranza/reporte-filtros-bar';
import { ReporteTableSection } from '@/components/cobranza/reporte-table-section';
import {
  cellEstadoBadge,
  cellMoneda,
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
import { GET_REPORTE_PROMESAS_PAGO } from '@/lib/graphql/queries/cobranza.queries';
import { exportReportePromesasPagoXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import type {
  ReportePromesaPagoItem,
  ReportePromesasPago,
} from '@/types/cobranza';

export default function ReportePromesasPagoPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

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

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      {
        label: 'Promesas',
        value: String(reporte.totalPromesas),
        sub: `${reporte.pendientes} pendientes`,
      },
      { label: 'Cumplidas', value: String(reporte.cumplidas), tone: 'success' },
      { label: 'Vencidas', value: String(reporte.vencidas), tone: 'danger' },
      { label: 'Cumplimiento', value: `${reporte.cumplimientoPct}%` },
    ];
  }, [reporte]);

  const columns = useMemo<ColumnDef<ReportePromesaPagoItem>[]>(
    () => [
      { accessorKey: 'noPrestamo', header: 'Préstamo' },
      { accessorKey: 'nombreCliente', header: 'Cliente' },
      {
        accessorKey: 'nombreGestor',
        header: 'Gestor',
        cell: ({ row }) => cellTexto(row.original.nombreGestor),
      },
      {
        accessorKey: 'montoPromesa',
        header: 'Monto',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.montoPromesa),
      },
      { accessorKey: 'fechaPromesa', header: 'Fecha' },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => cellEstadoBadge(row.original.estado),
      },
      {
        accessorKey: 'diasVencidos',
        header: 'Días venc.',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.diasVencidos),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promesas de pago"
        description="Cumplimiento de promesas: cumplidas, vencidas y pendientes."
      />

      <ReporteFiltrosBar
        idmandante={idmandante}
        onMandanteChange={(v) => {
          clearFeedback();
          setIdmandante(v);
        }}
        periodo={periodo}
        onPeriodoChange={(v) => {
          clearFeedback();
          setPeriodo(v);
        }}
        periodoId="periodo-promesas-pago"
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReportePromesasPagoXlsx(reporte));
        }}
      />

      {mandanteId === 0 ? (
        <p className="text-sm text-gray-5">
          Seleccione un mandante y el periodo para generar el reporte.
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
                  Indicadores del periodo
                </h2>
                <DashboardMetricStrip metrics={metrics} />
              </div>
              <ReporteTableSection
                title="Promesas de pago"
                description="Detalle de promesas registradas en el periodo"
                columns={columns}
                data={reporte.promesas}
                emptyMessage="Sin promesas en el periodo."
                itemLabel="promesas"
                initialPageSize={20}
                resetKey={`${mandanteId}-${periodo}`}
              />
            </div>
          ) : null}
        </ReporteAsyncContent>
      )}
    </div>
  );
}
