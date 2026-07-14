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
import { GET_REPORTE_MARGEN_MANDANTES } from '@/lib/graphql/queries/cobranza.queries';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteMargenMandantes,
  type ReporteMargenMandanteItem,
} from '@/types/cobranza';
import { exportReporteMargenMandantesXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';

export default function Page() {
  const [periodo, setPeriodo] = useState(periodoActual());
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteMargenMandantes: ReporteMargenMandantes;
  }>(
    GET_REPORTE_MARGEN_MANDANTES,
    { periodo },
    { enabled: periodoValido },
  );

  const reporte = data?.reporteMargenMandantes;

  const columns = useMemo<ColumnDef<ReporteMargenMandanteItem>[]>(
    () => [
      { accessorKey: 'mandanteNombre', header: 'Mandante' },
      {
        accessorKey: 'cantidadPagos',
        header: 'Pagos',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.cantidadPagos),
      },
      {
        accessorKey: 'totalRecuperado',
        header: 'Recuperado',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.totalRecuperado),
      },
      {
        accessorKey: 'totalIngresoEmpresa',
        header: 'Ingreso',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.totalIngresoEmpresa),
      },
      {
        accessorKey: 'totalComision',
        header: 'Comisión',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.totalComision),
      },
      {
        accessorKey: 'gananciaNeta',
        header: 'Ganancia neta',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.gananciaNeta),
      },
      {
        accessorKey: 'margenPct',
        header: 'Margen %',
        meta: { align: 'right' },
        cell: ({ row }) =>
          cellPorcentaje(row.original.margenPct, { tone: true }),
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
      { label: 'Recuperado', value: formatearMoneda(r.totalRecuperado) },
      {
        label: 'Ingreso',
        value: formatearMoneda(r.totalIngresoEmpresa),
        tone: 'primary',
      },
      {
        label: 'Ganancia neta',
        value: formatearMoneda(r.gananciaNeta),
        tone: 'success',
      },
      { label: 'Margen', value: `${r.margenPct}%` },
    ];
  }, [reporte]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Margen por mandante"
        description="Comparativo de ingreso, comisión y ganancia neta entre mandantes."
      />

      <ReporteFiltrosBar
        idmandante=""
        onMandanteChange={() => undefined}
        showMandante={false}
        periodo={periodo}
        onPeriodoChange={(v) => {
          clearFeedback();
          setPeriodo(v);
        }}
        periodoId="periodo-margen-mandantes"
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReporteMargenMandantesXlsx(reporte));
        }}
      />

      <ReporteAsyncContent
        isLoading={isLoading}
        error={error}
        hasData={Boolean(reporte)}
      >
        {reporte ? (
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                Resumen del periodo
              </h2>
              <DashboardMetricStrip metrics={metrics} />
            </div>
            <ReporteTableSection
              title="Por mandante"
              description="Ingreso, comisión y margen por mandante en el periodo"
              columns={columns}
              data={reporte.porMandante}
              emptyMessage="Sin datos de mandantes."
              itemLabel="mandantes"
              initialPageSize={20}
              resetKey={periodo}
            />
          </div>
        ) : null}
      </ReporteAsyncContent>
    </div>
  );
}
