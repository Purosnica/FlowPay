'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  FILTER_INPUT_CLASS,
  ReporteFiltrosBar,
} from '@/components/cobranza/reporte-filtros-bar';
import { ReporteTableSection } from '@/components/cobranza/reporte-table-section';
import {
  cellEstadoBadge,
  cellMoneda,
  cellNumero,
  cellTexto,
} from '@/components/cobranza/reporte-table-cells';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { ReporteAsyncContent } from '@/components/cobranza/reporte-async-content';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useReporteExportFeedback } from '@/hooks/use-reporte-export-feedback';
import { GET_REPORTE_COMISIONES_COBRADORES } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteComisionesXlsx } from '@/lib/cobranza/export-reportes-control-xlsx';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteComisionCobradorItem,
  type ReporteComisionesCobradores,
} from '@/types/cobranza';

export default function ReporteComisionesCobradoresPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [filtrarPeriodo, setFiltrarPeriodo] = useState(true);
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteComisionesCobradores: ReporteComisionesCobradores;
  }>(
    GET_REPORTE_COMISIONES_COBRADORES,
    {
      idmandante: mandanteId,
      periodo: filtrarPeriodo ? periodo : null,
    },
    {
      enabled: mandanteId > 0 && (!filtrarPeriodo || periodoValido),
    },
  );

  const reporte = data?.reporteComisionesCobradores;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      {
        label: 'Comisión total',
        value: formatearMoneda(reporte.totalComision),
        sub: `${reporte.cantidadLiquidaciones} liquidaciones`,
      },
      {
        label: 'Borrador',
        value: formatearMoneda(reporte.totalComisionBorrador),
      },
      {
        label: 'Por pagar (emitida)',
        value: formatearMoneda(reporte.totalComisionEmitida),
        tone: 'warning',
      },
      {
        label: 'Pagada',
        value: formatearMoneda(reporte.totalComisionPagada),
        tone: 'success',
      },
    ];
  }, [reporte]);

  const columns = useMemo<ColumnDef<ReporteComisionCobradorItem>[]>(
    () => [
      { accessorKey: 'periodo', header: 'Periodo' },
      {
        accessorKey: 'idliquidacion',
        header: 'Liquidación',
        cell: ({ row }) => cellNumero(row.original.idliquidacion),
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => cellEstadoBadge(row.original.estado),
      },
      {
        accessorKey: 'nombreGestor',
        header: 'Cobrador',
        cell: ({ row }) => cellTexto(row.original.nombreGestor),
      },
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
        header: 'Ingreso empresa',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.totalIngresoEmpresa),
      },
      {
        accessorKey: 'totalComision',
        header: 'Comisión',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.totalComision),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comisiones a cobradores"
        description="Pagos de comisión por liquidación: borrador, emitida (por pagar) y pagada."
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
          runExport(() => exportReporteComisionesXlsx(reporte));
        }}
      >
        <div>
          <label
            htmlFor="periodo-comisiones"
            className="mb-1 block text-sm font-medium text-dark dark:text-white"
          >
            Periodo
          </label>
          <input
            id="periodo-comisiones"
            type="month"
            value={periodo}
            disabled={!filtrarPeriodo}
            onChange={(e) => {
              clearFeedback();
              setPeriodo(e.target.value);
            }}
            className={`${FILTER_INPUT_CLASS} disabled:opacity-50`}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-dark dark:text-white">
          <input
            type="checkbox"
            checked={filtrarPeriodo}
            onChange={(e) => {
              clearFeedback();
              setFiltrarPeriodo(e.target.checked);
            }}
          />
          Filtrar por periodo
        </label>
      </ReporteFiltrosBar>

      {mandanteId === 0 ? (
        <p className="text-sm text-gray-5">
          Seleccione un mandante para ver las comisiones.
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
                  Resumen de comisiones
                </h2>
                <DashboardMetricStrip metrics={metrics} />
              </div>
              <ReporteTableSection
                title="Por cobrador / liquidación"
                description="Detalle de comisiones por liquidación y gestor"
                columns={columns}
                data={reporte.porCobrador}
                emptyMessage="Sin liquidaciones para el filtro seleccionado."
                itemLabel="filas"
                initialPageSize={20}
                resetKey={`${mandanteId}-${filtrarPeriodo ? periodo : 'all'}`}
              />
            </div>
          ) : null}
        </ReporteAsyncContent>
      )}
    </div>
  );
}
