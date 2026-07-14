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
import { GET_REPORTE_INGRESO_TRAMO_MORA } from '@/lib/graphql/queries/cobranza.queries';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import { exportReporteIngresoTramoMoraXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';
import {
  formatearMoneda,
  type ReporteIngresoTramoMora,
  type ReporteIngresoTramoItem,
} from '@/types/cobranza';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteIngresoTramoMora: ReporteIngresoTramoMora;
  }>(
    GET_REPORTE_INGRESO_TRAMO_MORA,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteIngresoTramoMora;

  const columns = useMemo<ColumnDef<ReporteIngresoTramoItem>[]>(
    () => [
      { accessorKey: 'tramo', header: 'Tramo' },
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
        accessorKey: 'margenPct',
        header: 'Margen %',
        meta: { align: 'right' },
        cell: ({ row }) =>
          cellPorcentaje(row.original.margenPct, { tone: true }),
      },
      {
        accessorKey: 'shareIngresoPct',
        header: 'Share %',
        meta: { align: 'right' },
        cell: ({ row }) => cellPorcentaje(row.original.shareIngresoPct),
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
        label: 'Ingreso empresa',
        value: formatearMoneda(r.totalIngresoEmpresa),
        tone: 'primary',
      },
      { label: 'Comisiones', value: formatearMoneda(r.totalComision) },
      {
        label: 'Ganancia neta',
        value: formatearMoneda(r.gananciaNeta),
        tone: 'success',
      },
    ];
  }, [reporte]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingreso por tramo de mora"
        description="Rentabilidad y share de ingreso por tramo de mora."
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
        periodoId="periodo-ingreso-tramo-mora"
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReporteIngresoTramoMoraXlsx(reporte));
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
                title="Ingreso por tramo"
                description="Pagos, ingreso, margen y share por tramo de mora"
                columns={columns}
                data={reporte.porTramo}
                emptyMessage="Sin pagos en el periodo."
                itemLabel="tramos"
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
