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
import { GET_REPORTE_MIGRACION_MORA } from '@/lib/graphql/queries/cobranza.queries';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import { exportReporteMigracionMoraXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';
import type {
  ReporteMigracionMora,
  ReporteMigracionMoraItem,
} from '@/types/cobranza';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteMigracionMora: ReporteMigracionMora;
  }>(
    GET_REPORTE_MIGRACION_MORA,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteMigracionMora;

  const columns = useMemo<ColumnDef<ReporteMigracionMoraItem>[]>(
    () => [
      { accessorKey: 'tramoOrigen', header: 'Origen' },
      { accessorKey: 'tramoDestino', header: 'Destino' },
      {
        accessorKey: 'cantidad',
        header: 'Cantidad',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.cantidad),
      },
      {
        accessorKey: 'saldoDestino',
        header: 'Saldo',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.saldoDestino),
      },
      {
        accessorKey: 'pct',
        header: '% del origen',
        meta: { align: 'right' },
        cell: ({ row }) => cellPorcentaje(row.original.pct),
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
      { label: 'Préstamos', value: String(r.totalPrestamos) },
      { label: 'Desde', value: r.fechaOrigen },
      { label: 'Hasta', value: r.fechaDestino },
    ];
  }, [reporte]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Migración de mora"
        description="Movimiento de cartera entre tramos de mora."
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
        periodoId="periodo-migracion-mora"
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReporteMigracionMoraXlsx(reporte));
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
                title="Migraciones entre tramos"
                description="Cantidad, saldo y porcentaje por transición de mora"
                columns={columns}
                data={reporte.migraciones}
                emptyMessage="Sin migraciones."
                itemLabel="migraciones"
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
