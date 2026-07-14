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
import { GET_REPORTE_CUMPLIMIENTO_ACUERDOS } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteCumplimientoXlsx } from '@/lib/cobranza/export-reportes-control-xlsx';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteCumplimientoAcuerdoItem,
  type ReporteCumplimientoAcuerdos,
} from '@/types/cobranza';

export default function ReporteCumplimientoAcuerdosPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteCumplimientoAcuerdos: ReporteCumplimientoAcuerdos;
  }>(
    GET_REPORTE_CUMPLIMIENTO_ACUERDOS,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteCumplimientoAcuerdos;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      {
        label: 'Acuerdos',
        value: String(reporte.totalAcuerdos),
        sub: `${reporte.vigentes} vigentes`,
      },
      {
        label: 'Cumplidos',
        value: String(reporte.cumplidos),
        tone: 'success',
      },
      {
        label: 'Rotos',
        value: String(reporte.rotos),
        tone: reporte.rotos > 0 ? 'danger' : 'default',
      },
      {
        label: 'Cumplimiento',
        value: `${reporte.cumplimientoPct}%`,
        sub: `${formatearMoneda(reporte.montoCumplido)} de ${formatearMoneda(reporte.montoAcordadoTotal)}`,
      },
    ];
  }, [reporte]);

  const columns = useMemo<ColumnDef<ReporteCumplimientoAcuerdoItem>[]>(
    () => [
      { accessorKey: 'noPrestamo', header: 'N° Préstamo' },
      { accessorKey: 'nombreCliente', header: 'Cliente' },
      {
        accessorKey: 'nombreGestor',
        header: 'Gestor',
        cell: ({ row }) => cellTexto(row.original.nombreGestor),
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => cellEstadoBadge(row.original.estado),
      },
      {
        accessorKey: 'montoAcordado',
        header: 'Monto',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.montoAcordado),
      },
      {
        accessorKey: 'numeroCuotas',
        header: 'Cuotas',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.numeroCuotas),
      },
      {
        accessorKey: 'cuotasPagadas',
        header: 'Pagadas',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.cuotasPagadas),
      },
      {
        accessorKey: 'cuotasPendientes',
        header: 'Pendientes',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.cuotasPendientes),
      },
      {
        accessorKey: 'cuotasVencidas',
        header: 'Vencidas',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.cuotasVencidas),
      },
      { accessorKey: 'fechaInicio', header: 'Inicio' },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cumplimiento de acuerdos"
        description="Acuerdos del periodo: vigentes, cumplidos, rotos y avance de cuotas."
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
        periodoId="periodo-cumplimiento"
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReporteCumplimientoXlsx(reporte));
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
                title="Acuerdos del periodo"
                description="Detalle de acuerdos creados y su avance de cuotas"
                columns={columns}
                data={reporte.acuerdos}
                emptyMessage="Sin acuerdos creados en el periodo."
                itemLabel="acuerdos"
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
