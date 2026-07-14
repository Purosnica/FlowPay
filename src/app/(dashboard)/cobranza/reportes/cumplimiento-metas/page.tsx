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
import { GET_REPORTE_CUMPLIMIENTO_METAS } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteCumplimientoMetasXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteCumplimientoMetaItem,
  type ReporteCumplimientoMetas,
} from '@/types/cobranza';

export default function ReporteCumplimientoMetasPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteCumplimientoMetas: ReporteCumplimientoMetas;
  }>(
    GET_REPORTE_CUMPLIMIENTO_METAS,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteCumplimientoMetas;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      {
        label: 'Meta mandante',
        value: formatearMoneda(reporte.metaRecuperacionMandante),
      },
      {
        label: 'Recuperado',
        value: formatearMoneda(reporte.recuperadoMandante),
        tone: 'primary',
      },
      { label: '% meta', value: `${reporte.pctMetaMandante}%` },
    ];
  }, [reporte]);

  const columns = useMemo<ColumnDef<ReporteCumplimientoMetaItem>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Cobrador' },
      {
        accessorKey: 'recuperadoMes',
        header: 'Recuperado',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.recuperadoMes),
      },
      {
        accessorKey: 'metaRecuperacionMes',
        header: 'Meta recup.',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.metaRecuperacionMes),
      },
      {
        accessorKey: 'pctMetaRecuperacion',
        header: '% recup.',
        meta: { align: 'right' },
        cell: ({ row }) =>
          cellPorcentaje(row.original.pctMetaRecuperacion, { tone: true }),
      },
      {
        accessorKey: 'gestionesSemana',
        header: 'Gest. semana',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.gestionesSemana),
      },
      {
        accessorKey: 'metaGestionesSemana',
        header: 'Meta gest.',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.metaGestionesSemana),
      },
      {
        accessorKey: 'pctMetaGestiones',
        header: '% gest.',
        meta: { align: 'right' },
        cell: ({ row }) =>
          cellPorcentaje(row.original.pctMetaGestiones, { tone: true }),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cumplimiento de metas"
        description="Meta vs recuperación/gestiones por cobrador."
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
        periodoId="periodo-cumplimiento-metas"
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReporteCumplimientoMetasXlsx(reporte));
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
                title="Cumplimiento por cobrador"
                description="Meta vs recuperación y gestiones por cobrador"
                columns={columns}
                data={reporte.cobradores}
                emptyMessage="Sin cobradores en el equipo."
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
