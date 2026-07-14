'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ReporteFiltrosBar } from '@/components/cobranza/reporte-filtros-bar';
import { ReporteTableSection } from '@/components/cobranza/reporte-table-section';
import {
  cellEstadoBadge,
  cellNumero,
  cellTexto,
} from '@/components/cobranza/reporte-table-cells';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { ReporteAsyncContent } from '@/components/cobranza/reporte-async-content';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useReporteExportFeedback } from '@/hooks/use-reporte-export-feedback';
import { GET_REPORTE_RECLAMOS_SLA } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteReclamosSlaXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';
import type {
  ReporteReclamosSla,
  ReporteReclamoSlaItem,
} from '@/types/cobranza';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

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
      {
        accessorKey: 'idreclamo',
        header: 'ID',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.idreclamo),
      },
      { accessorKey: 'nombreCliente', header: 'Cliente' },
      {
        accessorKey: 'noPrestamo',
        header: 'Préstamo',
        cell: ({ row }) => cellTexto(row.original.noPrestamo),
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => cellEstadoBadge(row.original.estado),
      },
      { accessorKey: 'fechaLimite', header: 'Límite' },
      {
        accessorKey: 'fueraSla',
        header: 'Fuera SLA',
        cell: ({ row }) => (
          <Badge
            variant={row.original.fueraSla ? 'danger' : 'success'}
            size="sm"
          >
            {row.original.fueraSla ? 'Sí' : 'No'}
          </Badge>
        ),
      },
      {
        accessorKey: 'diasFueraSla',
        header: 'Días fuera',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.diasFueraSla),
      },
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
      {
        label: 'Fuera SLA',
        value: String(r.fueraSla),
        tone: 'danger',
        sub: `${r.pctFueraSla}%`,
      },
    ];
  }, [reporte]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="SLA de reclamos"
        description="Reclamos abiertos, en proceso y fuera de SLA."
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
          runExport(() => exportReporteReclamosSlaXlsx(reporte));
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
                title="Reclamos"
                description="Estado y cumplimiento de SLA por reclamo"
                columns={columns}
                data={reporte.reclamos}
                emptyMessage="Sin reclamos."
                itemLabel="reclamos"
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
