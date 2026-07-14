'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ReporteFiltrosBar } from '@/components/cobranza/reporte-filtros-bar';
import { ReporteTableSection } from '@/components/cobranza/reporte-table-section';
import {
  cellMoneda,
  cellNumero,
  cellPorcentaje,
} from '@/components/cobranza/reporte-table-cells';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { ReporteAsyncContent } from '@/components/cobranza/reporte-async-content';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useReporteExportFeedback } from '@/hooks/use-reporte-export-feedback';
import { GET_REPORTE_CONCENTRACION_RIESGO } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteConcentracionRiesgoXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';
import {
  formatearMoneda,
  type ReporteConcentracionRiesgo,
  type ReporteConcentracionItem,
} from '@/types/cobranza';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteConcentracionRiesgo: ReporteConcentracionRiesgo;
  }>(
    GET_REPORTE_CONCENTRACION_RIESGO,
    { idmandante: mandanteId },
    { enabled: mandanteId > 0 },
  );

  const reporte = data?.reporteConcentracionRiesgo;

  const deudoresColumns = useMemo<ColumnDef<ReporteConcentracionItem>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Deudor' },
      {
        accessorKey: 'cantidadPrestamos',
        header: 'Préstamos',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.cantidadPrestamos),
      },
      {
        accessorKey: 'saldoMora',
        header: 'Saldo',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.saldoMora),
      },
      {
        accessorKey: 'shareSaldoPct',
        header: 'Share %',
        meta: { align: 'right' },
        cell: ({ row }) => cellPorcentaje(row.original.shareSaldoPct),
      },
    ],
    [],
  );

  const gestoresColumns = useMemo<ColumnDef<ReporteConcentracionItem>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Gestor' },
      {
        accessorKey: 'cantidadPrestamos',
        header: 'Préstamos',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.cantidadPrestamos),
      },
      {
        accessorKey: 'saldoMora',
        header: 'Saldo',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.saldoMora),
      },
      {
        accessorKey: 'shareSaldoPct',
        header: 'Share %',
        meta: { align: 'right' },
        cell: ({ row }) => cellPorcentaje(row.original.shareSaldoPct),
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
      {
        label: 'Saldo en mora',
        value: formatearMoneda(r.saldoMoraTotal),
        tone: 'warning',
      },
    ];
  }, [reporte]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Concentración de riesgo"
        description="Top deudores y gestores por saldo en mora."
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
          runExport(() => exportReporteConcentracionRiesgoXlsx(reporte));
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
                title="Top deudores"
                description="Concentración de saldo en mora por cliente"
                columns={deudoresColumns}
                data={reporte.topDeudores}
                emptyMessage="Sin cartera en mora."
                itemLabel="deudores"
                initialPageSize={20}
                resetKey={mandanteId}
              />
              <ReporteTableSection
                title="Top gestores"
                description="Concentración de saldo en mora por gestor"
                columns={gestoresColumns}
                data={reporte.topGestores}
                emptyMessage="Sin gestores."
                itemLabel="gestores"
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
