'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ReporteFiltrosBar } from '@/components/cobranza/reporte-filtros-bar';
import { ReporteTableSection } from '@/components/cobranza/reporte-table-section';
import {
  cellMoneda,
  cellNumero,
} from '@/components/cobranza/reporte-table-cells';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { ReporteAsyncContent } from '@/components/cobranza/reporte-async-content';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useReporteExportFeedback } from '@/hooks/use-reporte-export-feedback';
import { GET_REPORTE_PRODUCTIVIDAD_DIARIA } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteProductividadDiariaXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import type {
  ReporteProductividadDiaItem,
  ReporteProductividadDiaria,
  ReporteProductividadGestorResumen,
} from '@/types/cobranza';

export default function ReporteProductividadDiariaPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteProductividadDiaria: ReporteProductividadDiaria;
  }>(
    GET_REPORTE_PRODUCTIVIDAD_DIARIA,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteProductividadDiaria;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      { label: 'Gestiones', value: String(reporte.totalGestiones) },
      { label: 'Promedio/día', value: String(reporte.promedioGestionesDia) },
    ];
  }, [reporte]);

  const porDiaColumns = useMemo<ColumnDef<ReporteProductividadDiaItem>[]>(
    () => [
      { accessorKey: 'fecha', header: 'Fecha' },
      { accessorKey: 'nombreGestor', header: 'Cobrador' },
      {
        accessorKey: 'gestiones',
        header: 'Gestiones',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.gestiones),
      },
      {
        accessorKey: 'gestionesEfectivas',
        header: 'Efectivas',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.gestionesEfectivas),
      },
      {
        accessorKey: 'montoRecuperado',
        header: 'Recuperado',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.montoRecuperado),
      },
    ],
    [],
  );

  const porGestorColumns = useMemo<
    ColumnDef<ReporteProductividadGestorResumen>[]
  >(
    () => [
      { accessorKey: 'nombreGestor', header: 'Cobrador' },
      {
        accessorKey: 'diasActivos',
        header: 'Días activos',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.diasActivos),
      },
      {
        accessorKey: 'totalGestiones',
        header: 'Gestiones',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.totalGestiones),
      },
      {
        accessorKey: 'promedioGestionesDia',
        header: 'Promedio/día',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.promedioGestionesDia),
      },
      {
        accessorKey: 'totalRecuperado',
        header: 'Recuperado',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.totalRecuperado),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productividad diaria"
        description="Gestiones y recuperación por día y cobrador."
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
        periodoId="periodo-productividad-diaria"
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReporteProductividadDiariaXlsx(reporte));
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
                title="Por día"
                description="Gestiones y recuperación diarias por cobrador"
                columns={porDiaColumns}
                data={reporte.porDia}
                emptyMessage="Sin detalle diario."
                itemLabel="filas"
                initialPageSize={20}
                resetKey={`${mandanteId}-${periodo}`}
              />
              <ReporteTableSection
                title="Por gestor"
                description="Resumen de productividad por cobrador en el periodo"
                columns={porGestorColumns}
                data={reporte.porGestor}
                emptyMessage="Sin actividad."
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
