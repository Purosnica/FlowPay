'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ReporteFiltrosBar, FILTER_INPUT_CLASS } from '@/components/cobranza/reporte-filtros-bar';
import { ReporteTableSection } from '@/components/cobranza/reporte-table-section';
import { cellMoneda, cellPorcentaje, cellTexto } from '@/components/cobranza/reporte-table-cells';
import {
  DashboardMetricStrip,
  type DashboardMetric,
} from '@/components/dashboard/dashboard-metric-strip';
import { ReporteAsyncContent } from '@/components/cobranza/reporte-async-content';
import { PageHeader } from '@/components/ui/page-header';
import { FechaRangoInputs } from '@/components/cobranza/fecha-rango-inputs';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useRangoFechasActual } from '@/hooks/use-periodo-negocio-actual';
import { useReporteExportFeedback } from '@/hooks/use-reporte-export-feedback';
import { GET_REPORTE_RECUPERACION_CLIENTES } from '@/lib/graphql/queries/cobranza.queries';
import { exportReporteRecuperacionClientesXlsx } from '@/lib/cobranza/export-reporte-recuperacion-clientes-xlsx';
import { esRangoFechasValido } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type ReporteRecuperacionClienteItem,
  type ReporteRecuperacionClientes,
} from '@/types/cobranza';

export default function ReporteRecuperacionClientesPage() {
  const [periodo, setPeriodo] = useRangoFechasActual();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const { exportOk, exportError, clearFeedback, runExport } = useReporteExportFeedback();
  const periodoValido = esRangoFechasValido(periodo);
  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    reporteRecuperacionClientes: ReporteRecuperacionClientes;
  }>(
    GET_REPORTE_RECUPERACION_CLIENTES,
    { periodo, search: search || null },
    { enabled: periodoValido }
  );
  const reporte = data?.reporteRecuperacionClientes;

  const metrics = useMemo<DashboardMetric[]>(
    () =>
      reporte
        ? [
            { label: 'Depósitos', value: String(reporte.totalDepositos) },
            {
              label: 'Monto abonado',
              value: formatearMoneda(reporte.totalAbonado),
              tone: 'success',
            },
            {
              label: 'Saldo pendiente',
              value: formatearMoneda(reporte.saldoPendienteTotal),
              tone: 'warning',
            },
            {
              label: 'Recuperación',
              value: `${reporte.recuperacionPct.toFixed(2)}%`,
              tone: 'primary',
            },
          ]
        : [],
    [reporte]
  );

  const columns = useMemo<ColumnDef<ReporteRecuperacionClienteItem>[]>(
    () => [
      {
        accessorKey: 'nombreCliente',
        header: 'Nombre cliente',
        cell: ({ row }) => cellTexto(row.original.nombreCliente),
      },
      {
        accessorKey: 'codigoUnico',
        header: 'Código único',
        cell: ({ row }) => cellTexto(row.original.codigoUnico),
      },
      {
        accessorKey: 'saldoInicial',
        header: 'Monto saldo inicial',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.saldoInicial),
      },
      {
        accessorKey: 'ejecutivo',
        header: 'Ejecutivo',
        cell: ({ row }) => cellTexto(row.original.ejecutivo),
      },
      {
        accessorKey: 'fechaDeposito',
        header: 'Fecha de depósitos',
        cell: ({ row }) => cellTexto(row.original.fechaDeposito),
      },
      {
        accessorKey: 'tramoMora',
        header: 'Tramo de mora',
        cell: ({ row }) => cellTexto(row.original.tramoMora),
      },
      {
        accessorKey: 'sucursal',
        header: 'Sucursal',
        cell: ({ row }) => cellTexto(row.original.sucursal),
      },
      { accessorKey: 'banco', header: 'Banco', cell: ({ row }) => cellTexto(row.original.banco) },
      {
        accessorKey: 'interesesMoratorios',
        header: 'Intereses moratorios',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.interesesMoratorios),
      },
      {
        accessorKey: 'descuentos',
        header: 'Descuentos',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.descuentos),
      },
      {
        accessorKey: 'saldoALaFecha',
        header: 'Saldo a la fecha',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.saldoALaFecha),
      },
      {
        accessorKey: 'montoAbonado',
        header: 'Monto abonado',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.montoAbonado),
      },
      {
        accessorKey: 'saldoPendiente',
        header: 'Saldo pendiente',
        meta: { align: 'right' },
        cell: ({ row }) => cellMoneda(row.original.saldoPendiente),
      },
      {
        accessorKey: 'porcentajeRecuperado',
        header: '% recuperado',
        meta: { align: 'right' },
        cell: ({ row }) => cellPorcentaje(row.original.porcentajeRecuperado),
      },
    ],
    []
  );

  const aplicarBusqueda = () => {
    clearFeedback();
    setSearch(searchInput.trim());
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recuperación por clientes"
        description="Detalle de depósitos aplicados, saldo y recuperación por cliente en el rango seleccionado."
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
        onExport={() => reporte && runExport(() => exportReporteRecuperacionClientesXlsx(reporte))}
      >
        <FechaRangoInputs
          id="periodo-recuperacion-clientes"
          value={periodo}
          onChange={(value) => {
            clearFeedback();
            setPeriodo(value);
          }}
          inputClassName={FILTER_INPUT_CLASS}
        />
        <div className="min-w-[240px] flex-1">
          <label
            htmlFor="buscar-recuperacion-cliente"
            className="mb-1 block text-sm font-medium text-dark dark:text-white"
          >
            Filtrar por cliente
          </label>
          <div className="flex gap-2">
            <input
              id="buscar-recuperacion-cliente"
              type="search"
              value={searchInput}
              placeholder="Nombre o documento"
              className={FILTER_INPUT_CLASS}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && aplicarBusqueda()}
            />
            <button
              type="button"
              className="rounded border border-stroke px-3 py-2 text-sm font-medium text-dark hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              onClick={aplicarBusqueda}
            >
              Buscar
            </button>
          </div>
        </div>
      </ReporteFiltrosBar>
      <ReporteAsyncContent isLoading={isLoading} error={error} hasData={Boolean(reporte)}>
        {reporte && (
          <div className="space-y-6">
            <DashboardMetricStrip metrics={metrics} />
            <ReporteTableSection
              title="Depósitos recuperados"
              description={`Período: ${reporte.periodo}. Cada registro corresponde a un depósito aplicado.`}
              columns={columns}
              data={reporte.registros}
              emptyMessage="No hay depósitos aplicados para los filtros seleccionados."
              itemLabel="depósitos"
              initialPageSize={20}
              resetKey={`${periodo}-${search}`}
            />
          </div>
        )}
      </ReporteAsyncContent>
    </div>
  );
}
