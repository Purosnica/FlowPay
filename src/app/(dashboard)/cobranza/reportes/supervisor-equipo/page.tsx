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
import { GET_REPORTE_SUPERVISOR_EQUIPO } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteSupervisorEquipoXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteSupervisorEquipo,
  type ReporteSupervisorEquipoItem,
} from '@/types/cobranza';

export default function ReporteSupervisorEquipoPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteSupervisorEquipo: ReporteSupervisorEquipo;
  }>(
    GET_REPORTE_SUPERVISOR_EQUIPO,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteSupervisorEquipo;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      { label: 'Cobradores', value: String(reporte.totalCobradores) },
      {
        label: 'Recuperado',
        value: formatearMoneda(reporte.totalRecuperado),
        tone: 'primary',
      },
      {
        label: 'Promedio recup.',
        value: formatearMoneda(reporte.promedioRecuperado),
      },
      {
        label: 'Promedio efect.',
        value: `${reporte.promedioEfectividad}%`,
      },
    ];
  }, [reporte]);

  const columns = useMemo<ColumnDef<ReporteSupervisorEquipoItem>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Cobrador' },
      {
        accessorKey: 'gestiones',
        header: 'Gestiones',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.gestiones),
      },
      {
        accessorKey: 'efectividadPct',
        header: 'Efectividad %',
        meta: { align: 'right' },
        cell: ({ row }) =>
          cellPorcentaje(row.original.efectividadPct, { tone: true }),
      },
      {
        accessorKey: 'montoRecuperado',
        header: 'Recuperado',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.montoRecuperado),
      },
      {
        accessorKey: 'brechaVsPromedioRecuperado',
        header: 'Brecha recup.',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.brechaVsPromedioRecuperado),
      },
      {
        accessorKey: 'brechaVsPromedioEfectividad',
        header: 'Brecha efect.',
        meta: { align: 'right' },
        cell: ({ row }) =>
          cellPorcentaje(row.original.brechaVsPromedioEfectividad),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervisor vs equipo"
        description="Ranking del equipo con brechas vs promedio."
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
        periodoId="periodo-supervisor-equipo"
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReporteSupervisorEquipoXlsx(reporte));
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
                  Indicadores del equipo
                </h2>
                <DashboardMetricStrip metrics={metrics} />
              </div>
              <ReporteTableSection
                title="Ranking del equipo"
                description="Desempeño individual y brechas vs promedio del equipo"
                columns={columns}
                data={reporte.ranking}
                emptyMessage="Sin equipo para comparar."
                itemLabel="cobradores"
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
