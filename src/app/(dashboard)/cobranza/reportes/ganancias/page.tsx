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
import { GET_REPORTE_GANANCIAS } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteGananciasXlsx } from '@/lib/cobranza/export-reportes-control-xlsx';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteGanancias,
  type ReporteGananciasGestorItem,
  type ReporteGananciasTramoItem,
} from '@/types/cobranza';

export default function ReporteGananciasPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteGanancias: ReporteGanancias;
  }>(
    GET_REPORTE_GANANCIAS,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteGanancias;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      {
        label: 'Recuperado',
        value: formatearMoneda(reporte.totalRecuperado),
        sub: `${reporte.cantidadPagos} pagos`,
      },
      {
        label: 'Ingreso empresa',
        value: formatearMoneda(reporte.totalIngresoEmpresa),
        tone: 'primary',
      },
      {
        label: 'Comisiones',
        value: formatearMoneda(reporte.totalComision),
      },
      {
        label: 'Ganancia neta',
        value: formatearMoneda(reporte.gananciaNeta),
        sub: `Margen ${reporte.margenPct}%`,
        tone: 'success',
      },
    ];
  }, [reporte]);

  const gestorColumns = useMemo<ColumnDef<ReporteGananciasGestorItem>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Gestor' },
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
        header: 'Margen',
        meta: { align: 'right' },
        cell: ({ row }) =>
          cellPorcentaje(row.original.margenPct, { tone: true }),
      },
    ],
    [],
  );

  const tramoColumns = useMemo<ColumnDef<ReporteGananciasTramoItem>[]>(
    () => [
      { accessorKey: 'tramo', header: 'Tramo mora' },
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
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporte de ganancias"
        description="Ingreso empresa, comisiones y ganancia neta por gestor y tramos de % recuperación del mandante."
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
        periodoId="periodo-ganancias"
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReporteGananciasXlsx(reporte));
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
                  Resumen financiero
                </h2>
                <DashboardMetricStrip metrics={metrics} />
              </div>
              <ReporteTableSection
                title="Por gestor"
                description="Desglose de recuperación, ingreso y margen por cobrador"
                columns={gestorColumns}
                data={reporte.porGestor}
                emptyMessage="Sin pagos aplicados en el periodo."
                itemLabel="gestores"
                initialPageSize={20}
                resetKey={`${mandanteId}-${periodo}`}
              />
              <ReporteTableSection
                title="Por tramo de mora"
                description="Desglose según tramos de % de recuperación configurados en el mandante"
                columns={tramoColumns}
                data={reporte.porTramoMora}
                emptyMessage="Sin tramos de recuperación configurados para el mandante."
                itemLabel="tramos"
                initialPageSize={10}
                resetKey={`${mandanteId}-${periodo}`}
              />
            </div>
          ) : null}
        </ReporteAsyncContent>
      )}
    </div>
  );
}
