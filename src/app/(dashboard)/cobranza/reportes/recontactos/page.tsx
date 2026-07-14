'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  FILTER_INPUT_CLASS,
  ReporteFiltrosBar,
} from '@/components/cobranza/reporte-filtros-bar';
import { ReporteTableSection } from '@/components/cobranza/reporte-table-section';
import {
  cellMoneda,
  cellMoraDias,
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
import { GET_REPORTE_RECONTACTOS } from '@/lib/graphql/queries/cobranza.queries';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import { exportReporteRecontactosXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';
import {
  formatearMoneda,
  type ReporteRecontactos,
  type ReporteRecontactoItem,
} from '@/types/cobranza';

export default function Page() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [minGestiones, setMinGestiones] = useState(3);
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const mandanteId = idmandante === '' ? 0 : idmandante;
  const periodoValido = /^\d{4}-\d{2}$/.test(periodo);

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteRecontactos: ReporteRecontactos;
  }>(
    GET_REPORTE_RECONTACTOS,
    { idmandante: mandanteId, periodo, minGestiones },
    { enabled: mandanteId > 0 && periodoValido },
  );

  const reporte = data?.reporteRecontactos;

  const columns = useMemo<ColumnDef<ReporteRecontactoItem>[]>(
    () => [
      {
        accessorKey: 'noPrestamo',
        header: 'Préstamo',
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
        accessorKey: 'gestionesPeriodo',
        header: 'Gestiones',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.gestionesPeriodo),
      },
      {
        accessorKey: 'diasMora',
        header: 'Mora',
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
        accessorKey: 'ultimaGestion',
        header: 'Última gestión',
        cell: ({ row }) => cellTexto(row.original.ultimaGestion),
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
      { label: 'Préstamos', value: String(r.totalPrestamos), tone: 'warning' },
      { label: 'Saldo', value: formatearMoneda(r.saldoTotal) },
      { label: 'Umbral gestiones', value: String(r.minGestiones) },
    ];
  }, [reporte]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recontactos sin pago"
        description="Préstamos con muchas gestiones y sin pago aplicado."
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
        periodoId="periodo-recontactos"
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReporteRecontactosXlsx(reporte));
        }}
      >
        <div>
          <label
            htmlFor="min-gest-recontactos"
            className="mb-1 block text-sm font-medium text-dark dark:text-white"
          >
            Mín. gestiones
          </label>
          <select
            id="min-gest-recontactos"
            value={minGestiones}
            onChange={(e) => {
              clearFeedback();
              setMinGestiones(Number(e.target.value));
            }}
            className={FILTER_INPUT_CLASS}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={8}>8</option>
          </select>
        </div>
      </ReporteFiltrosBar>

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
                title="Préstamos en recontacto"
                description="Casos con gestiones sin pago en el umbral seleccionado"
                columns={columns}
                data={reporte.prestamos}
                emptyMessage="Sin recontactos en el umbral."
                itemLabel="préstamos"
                initialPageSize={20}
                resetKey={`${mandanteId}-${periodo}-${minGestiones}`}
              />
            </div>
          ) : null}
        </ReporteAsyncContent>
      )}
    </div>
  );
}
