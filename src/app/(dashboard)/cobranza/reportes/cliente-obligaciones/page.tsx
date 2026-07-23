'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
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
import { GET_REPORTE_CLIENTE_OBLIGACIONES } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteClienteObligacionesXlsx } from '@/lib/cobranza/export-reportes-avanzados-xlsx';
import {
  formatearMoneda,
  type ReporteClienteObligacionItem,
  type ReporteClienteObligaciones,
  type ReporteClienteObligacionesCliente,
  type ReporteClienteMandanteResumen,
} from '@/types/cobranza';

const MIN_MANDANTES_OPTIONS = [1, 2, 3, 4, 5] as const;

export default function Page() {
  const [minMandantes, setMinMandantes] = useState(2);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [idclienteSel, setIdclienteSel] = useState<number | null>(null);
  const { exportOk, exportError, clearFeedback, runExport } =
    useReporteExportFeedback();

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteClienteObligaciones: ReporteClienteObligaciones;
  }>(GET_REPORTE_CLIENTE_OBLIGACIONES, {
    minMandantes,
    search: search || null,
    idcliente: null,
  });

  const reporte = data?.reporteClienteObligaciones;

  const clienteDetalle = useMemo(() => {
    if (!reporte || idclienteSel == null) {
      return null;
    }
    return (
      reporte.clientes.find((c) => c.idcliente === idclienteSel) ?? null
    );
  }, [reporte, idclienteSel]);

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!reporte) {
      return [];
    }
    return [
      {
        label: `Clientes (≥ ${reporte.minMandantes} mandantes)`,
        value: String(reporte.totalClientes),
      },
      {
        label: 'Con deuda en ≥2 mandantes',
        value: String(reporte.clientesMultiMandante),
        tone:
          reporte.clientesMultiMandante > 0 ? 'warning' : 'success',
      },
      {
        label: 'Préstamos',
        value: String(reporte.totalPrestamos),
      },
      {
        label: 'Saldo total',
        value: formatearMoneda(reporte.totalSaldo),
        tone: 'warning',
      },
    ];
  }, [reporte]);

  const clientesColumns = useMemo<
    ColumnDef<ReporteClienteObligacionesCliente>[]
  >(
    () => [
      {
        accessorKey: 'numerodocumento',
        header: 'Documento',
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setIdclienteSel(row.original.idcliente)}
          >
            {row.original.numerodocumento}
          </button>
        ),
      },
      {
        accessorKey: 'nombreCliente',
        header: 'Cliente',
        cell: ({ row }) => (
          <Link
            href={`/clientes/${row.original.idcliente}`}
            className="font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.nombreCliente}
          </Link>
        ),
      },
      {
        accessorKey: 'cantidadMandantesConDeuda',
        header: 'Mandantes (N)',
        meta: { align: 'right' },
        cell: ({ row }) =>
          cellNumero(row.original.cantidadMandantesConDeuda),
      },
      {
        accessorKey: 'cantidadPrestamos',
        header: 'Préstamos',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.cantidadPrestamos),
      },
      {
        accessorKey: 'saldoTotal',
        header: 'Saldo',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.saldoTotal),
      },
      {
        accessorKey: 'maxDiasMora',
        header: 'Máx. mora',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoraDias(row.original.maxDiasMora),
      },
      {
        id: 'mandantesNombres',
        header: 'Mandantes',
        cell: ({ row }) =>
          cellTexto(
            row.original.mandantes.map((m) => m.mandanteNombre).join(', '),
          ),
      },
    ],
    [],
  );

  const mandantesColumns = useMemo<
    ColumnDef<ReporteClienteMandanteResumen>[]
  >(
    () => [
      { accessorKey: 'mandanteNombre', header: 'Mandante' },
      { accessorKey: 'mandanteCodigo', header: 'Código' },
      {
        accessorKey: 'cantidadPrestamos',
        header: 'Préstamos',
        meta: { align: 'right' },
        cell: ({ row }) => cellNumero(row.original.cantidadPrestamos),
      },
      {
        accessorKey: 'saldoTotal',
        header: 'Saldo',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.saldoTotal),
      },
      {
        accessorKey: 'maxDiasMora',
        header: 'Máx. mora',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoraDias(row.original.maxDiasMora),
      },
    ],
    [],
  );

  const obligacionesColumns = useMemo<
    ColumnDef<ReporteClienteObligacionItem>[]
  >(
    () => [
      {
        accessorKey: 'noPrestamo',
        header: 'N° Préstamo',
        cell: ({ row }) =>
          cellPrestamoLink(row.original.idprestamo, row.original.noPrestamo),
      },
      { accessorKey: 'mandanteNombre', header: 'Mandante' },
      { accessorKey: 'estado', header: 'Estado' },
      {
        accessorKey: 'saldoTotal',
        header: 'Saldo',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.saldoTotal),
      },
      {
        accessorKey: 'diasMora',
        header: 'Días mora',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoraDias(row.original.diasMora),
      },
      { accessorKey: 'moneda', header: 'Moneda' },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cliente obligaciones"
        description="Obligaciones activas por mandante y clientes con deuda en N mandantes."
      />

      <ReporteFiltrosBar
        idmandante=""
        onMandanteChange={() => undefined}
        showMandante={false}
        canExport={Boolean(reporte)}
        isFetching={isFetching}
        exportOk={exportOk}
        exportError={exportError}
        onRefresh={() => void refetch()}
        onExport={() => {
          if (!reporte) return;
          runExport(() => exportReporteClienteObligacionesXlsx(reporte));
        }}
      >
        <div>
          <label
            htmlFor="min-mandantes"
            className="mb-1 block text-sm font-medium text-dark dark:text-white"
          >
            Mín. mandantes con deuda (N)
          </label>
          <select
            id="min-mandantes"
            value={minMandantes}
            onChange={(e) => {
              clearFeedback();
              setIdclienteSel(null);
              setMinMandantes(Number(e.target.value));
            }}
            className={FILTER_INPUT_CLASS}
          >
            {MIN_MANDANTES_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n === 1 ? '1 o más' : `${n} o más`}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="search-cliente"
            className="mb-1 block text-sm font-medium text-dark dark:text-white"
          >
            Buscar cliente
          </label>
          <div className="flex gap-2">
            <input
              id="search-cliente"
              type="search"
              value={searchInput}
              placeholder="Documento o nombre"
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  clearFeedback();
                  setIdclienteSel(null);
                  setSearch(searchInput.trim());
                }
              }}
              className={FILTER_INPUT_CLASS}
            />
            <button
              type="button"
              className="rounded border border-stroke px-3 py-2 text-sm font-medium text-dark hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              onClick={() => {
                clearFeedback();
                setIdclienteSel(null);
                setSearch(searchInput.trim());
              }}
            >
              Buscar
            </button>
          </div>
        </div>
      </ReporteFiltrosBar>

      <ReporteAsyncContent
        isLoading={isLoading}
        error={error}
        hasData={Boolean(reporte)}
      >
        {reporte ? (
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                Indicadores
              </h2>
              <DashboardMetricStrip metrics={metrics} />
            </div>

            <ReporteTableSection
              title="Clientes con obligaciones"
              description={`Filtrado: deuda activa en al menos ${reporte.minMandantes} mandante(s).`}
              columns={clientesColumns}
              data={reporte.clientes}
              emptyMessage="No hay clientes con obligaciones para los filtros."
              itemLabel="clientes"
              initialPageSize={20}
              resetKey={`${minMandantes}-${search}`}
            />

            {clienteDetalle ? (
              <div className="space-y-4 rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-dark dark:text-white">
                      {clienteDetalle.nombreCliente}
                    </h3>
                    <p className="text-sm text-gray-5">
                      Doc. {clienteDetalle.numerodocumento} · Deuda con{' '}
                      <span className="font-semibold text-dark dark:text-white">
                        {clienteDetalle.cantidadMandantesConDeuda}
                      </span>{' '}
                      mandante(s) · {formatearMoneda(clienteDetalle.saldoTotal)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => setIdclienteSel(null)}
                  >
                    Cerrar detalle
                  </button>
                </div>

                <ReporteTableSection
                  title="Deuda por mandante"
                  description="Resumen de obligaciones agrupadas por acreedor"
                  columns={mandantesColumns}
                  data={clienteDetalle.mandantes}
                  emptyMessage="Sin mandantes."
                  itemLabel="mandantes"
                  initialPageSize={10}
                  resetKey={clienteDetalle.idcliente}
                />

                <ReporteTableSection
                  title="Obligaciones"
                  description="Préstamos activos con saldo"
                  columns={obligacionesColumns}
                  data={clienteDetalle.obligaciones}
                  emptyMessage="Sin obligaciones."
                  itemLabel="obligaciones"
                  initialPageSize={20}
                  resetKey={clienteDetalle.idcliente}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-5">
                Seleccione el documento de un cliente para ver el detalle por
                mandante y sus obligaciones.
              </p>
            )}
          </div>
        ) : null}
      </ReporteAsyncContent>
    </div>
  );
}
