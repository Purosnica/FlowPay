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
import { GET_REPORTE_EFECTIVIDAD } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteEfectividadXlsx } from '@/lib/cobranza/export-reportes-control-xlsx';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteEfectividad,
  type ReporteEfectividadGestorItem,
} from '@/types/cobranza';

export default function ReporteEfectividadPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteEfectividad: ReporteEfectividad;
  }>(
    GET_REPORTE_EFECTIVIDAD,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteEfectividad;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      {
        label: 'Gestiones',
        value: String(reporte.totalGestiones),
        sub: `${reporte.totalGestionesEfectivas} efectivas`,
      },
      {
        label: 'Efectividad',
        value: `${reporte.efectividadPct}%`,
        tone:
          reporte.efectividadPct >= 40
            ? 'success'
            : reporte.efectividadPct > 0
              ? 'warning'
              : 'default',
      },
      {
        label: 'Tasa de contacto',
        value: `${reporte.tasaContactoPct}%`,
      },
      {
        label: 'Recuperado',
        value: formatearMoneda(reporte.totalRecuperado),
        tone: 'primary',
      },
    ];
  }, [reporte]);

  const columns = useMemo<ColumnDef<ReporteEfectividadGestorItem>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Cobrador' },
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
        accessorKey: 'efectividadPct',
        header: 'Efectividad',
        meta: { align: 'right' },
        cell: ({ row }) =>
          cellPorcentaje(row.original.efectividadPct, { tone: true }),
      },
      {
        accessorKey: 'tasaContactoPct',
        header: 'Contacto',
        meta: { align: 'right' },
        cell: ({ row }) => cellPorcentaje(row.original.tasaContactoPct),
      },
      {
        accessorKey: 'montoRecuperado',
        header: 'Recuperado',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.montoRecuperado),
      },
      {
        accessorKey: 'prestamosAsignados',
        header: 'Asignados',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.prestamosAsignados),
      },
      {
        accessorKey: 'prestamosEnMora',
        header: 'En mora',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.prestamosEnMora),
      },
      {
        accessorKey: 'saldoAsignado',
        header: 'Saldo',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.saldoAsignado),
      },
      {
        accessorKey: 'recuperacionPct',
        header: 'Recuperación',
        meta: { align: 'right' },
        cell: ({ row }) =>
          cellPorcentaje(row.original.recuperacionPct, { tone: true }),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporte de efectividad"
        description="Conversión operativa por cobrador: gestiones, contacto, recuperación y cartera."
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
        periodoId="periodo-efectividad"
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReporteEfectividadXlsx(reporte));
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
                title="Desempeño por cobrador"
                description="Gestiones, efectividad y recuperación ordenables por columna"
                columns={columns}
                data={reporte.porGestor}
                emptyMessage="Sin actividad de cobradores en el periodo."
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
