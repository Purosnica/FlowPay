'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  FILTER_INPUT_CLASS,
  ReporteFiltrosBar,
} from '@/components/cobranza/reporte-filtros-bar';
import { ReporteTableSection } from '@/components/cobranza/reporte-table-section';
import {
  cellMoraDias,
  cellMoneda,
  cellNumero,
  cellPrestamoLink,
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
import { GET_REPORTE_CARTERA_SIN_GESTION } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteCarteraSinGestionXlsx } from '@/lib/cobranza/export-reportes-control-xlsx';
import {
  formatearMoneda,
  type ReporteCarteraSinGestion,
  type ReporteCarteraSinGestionItem,
} from '@/types/cobranza';

const DIAS_OPTIONS = [7, 15, 30] as const;

export default function ReporteCarteraSinGestionPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [diasSinGestion, setDiasSinGestion] = useState<number>(7);
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteCarteraSinGestion: ReporteCarteraSinGestion;
  }>(
    GET_REPORTE_CARTERA_SIN_GESTION,
    { idmandante: mandanteId, diasSinGestion },
    { enabled: mandanteId > 0 },
  );

  const reporte = data?.reporteCarteraSinGestion;

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    const base: DashboardMetric[] = [
      {
        label: `Sin gestión ≥ ${reporte.diasSinGestion}d`,
        value: String(reporte.totalPrestamos),
        sub: formatearMoneda(reporte.saldoTotal),
        tone: reporte.totalPrestamos > 0 ? 'warning' : 'success',
      },
    ];
    for (const t of reporte.resumenTramos) {
      base.push({
        label: `≥ ${t.diasUmbral} días`,
        value: String(t.cantidadPrestamos),
        sub: formatearMoneda(t.saldoTotal),
      });
    }
    return base;
  }, [reporte]);

  const columns = useMemo<ColumnDef<ReporteCarteraSinGestionItem>[]>(
    () => [
      {
        accessorKey: 'noPrestamo',
        header: 'N° Préstamo',
        cell: ({ row }) =>
          cellPrestamoLink(row.original.idprestamo, row.original.noPrestamo),
      },
      { accessorKey: 'nombreCliente', header: 'Cliente' },
      {
        accessorKey: 'nombreGestor',
        header: 'Gestor',
        cell: ({ row }) => cellTexto(row.original.nombreGestor),
      },
      {
        accessorKey: 'diasMora',
        header: 'Días mora',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoraDias(row.original.diasMora),
      },
      {
        accessorKey: 'saldoTotal',
        header: 'Saldo',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.saldoTotal),
      },
      {
        accessorKey: 'diasSinGestion',
        header: 'Días sin gestión',
        meta: { align: 'right' },
        cell: ({ row }) =>
          row.original.diasSinGestion != null
            ? cellNumero(row.original.diasSinGestion)
            : cellTexto('Nunca'),
      },
      {
        accessorKey: 'ultimaGestion',
        header: 'Última gestión',
        cell: ({ row }) => cellTexto(row.original.ultimaGestion),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartera sin gestión"
        description="Casos activos sin contacto reciente: riesgo operativo y puntos de mejora."
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
          runExport(() => exportReporteCarteraSinGestionXlsx(reporte));
        }}
      >
        <div>
          <label
            htmlFor="dias-sin-gestion"
            className="mb-1 block text-sm font-medium text-dark dark:text-white"
          >
            Días sin gestión
          </label>
          <select
            id="dias-sin-gestion"
            value={diasSinGestion}
            onChange={(e) => {
              clearFeedback();
              setDiasSinGestion(Number(e.target.value));
            }}
            className={FILTER_INPUT_CLASS}
          >
            {DIAS_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} días
              </option>
            ))}
          </select>
        </div>
      </ReporteFiltrosBar>

      {mandanteId === 0 ? (
        <p className="text-sm text-gray-5">
          Seleccione un mandante para ver la cartera sin gestión.
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
                  Indicadores de cartera
                </h2>
                <DashboardMetricStrip metrics={metrics} />
              </div>
              <ReporteTableSection
                title="Préstamos sin gestión"
                description="Casos activos sin contacto reciente en el umbral seleccionado"
                columns={columns}
                data={reporte.prestamos}
                emptyMessage="Sin préstamos sin gestión en el umbral seleccionado."
                itemLabel="préstamos"
                initialPageSize={20}
                resetKey={`${mandanteId}-${diasSinGestion}`}
              />
            </div>
          ) : null}
        </ReporteAsyncContent>
      )}
    </div>
  );
}
