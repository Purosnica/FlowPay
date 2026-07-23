'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { AsyncPanel } from '@/components/ui/async-panel';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { usePagination } from '@/hooks/use-pagination';
import { GET_GESTIONES_HOY } from '@/lib/graphql/queries/cobranza.queries';
import {
  formatFechaHoraNegocio,
  partesEnZona,
} from '@/lib/utils/timezone';
import type { GestionHoy } from '@/types/cobranza';
import { formatNombreClienteDisplay } from '@/lib/logic/cliente-tipo-persona-logic';

function fechaHoyIso(): string {
  const p = partesEnZona(new Date());
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export default function GestionesHoyPage() {
  const [fechaDesde, setFechaDesde] = useState(fechaHoyIso);
  const [fechaHasta, setFechaHasta] = useState(fechaHoyIso);
  const [usarRango, setUsarRango] = useState(false);

  const {
    queryVars,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
  } = usePagination();

  const { data, isLoading, error } = useGraphQLQuery<{
    misGestionesHoy: {
      gestiones: GestionHoy[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_GESTIONES_HOY, {
    ...queryVars,
    fechaDesde: usarRango ? fechaDesde : null,
    fechaHasta: usarRango ? fechaHasta : null,
  });

  const gestionesData = data?.misGestionesHoy;

  const columns = useMemo<ColumnDef<GestionHoy>[]>(
    () => [
      {
        id: 'prestamo',
        header: 'Préstamo',
        cell: ({ row }) => (
          <Link
            href={`/cobranza/prestamos/${row.original.idprestamo}`}
            className="text-primary hover:underline"
          >
            {row.original.prestamo?.noPrestamo ?? row.original.idprestamo}
          </Link>
        ),
      },
      {
        id: 'deudor',
        header: 'Deudor',
        cell: ({ row }) => {
          const c = row.original.prestamo?.cliente;
          return c ? formatNombreClienteDisplay(c) : '-';
        },
      },
      {
        accessorKey: 'codresult.codigo',
        header: 'Resultado',
        cell: ({ row }) => row.original.codresult?.codigo ?? '-',
      },
      {
        accessorKey: 'nota',
        header: 'Nota',
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-xs">{row.original.nota}</span>
        ),
      },
      {
        accessorKey: 'fechaGestion',
        header: 'Fecha',
        cell: ({ row }) =>
          formatFechaHoraNegocio(row.original.fechaGestion),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={usarRango ? 'Mis gestiones' : 'Mis gestiones de hoy'}
        description={
          usarRango
            ? 'Historial de gestiones registradas en el rango seleccionado.'
            : 'Gestiones registradas hoy y promesas con seguimiento para hoy.'
        }
      />

      <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label
              htmlFor="gestiones-fecha-desde"
              className="mb-1 block text-sm font-medium text-dark dark:text-white"
            >
              Desde
            </label>
            <input
              id="gestiones-fecha-desde"
              type="date"
              value={fechaDesde}
              disabled={!usarRango}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                resetPage();
              }}
              className="w-full rounded-lg border border-stroke px-3 py-2 text-sm disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="gestiones-fecha-hasta"
              className="mb-1 block text-sm font-medium text-dark dark:text-white"
            >
              Hasta
            </label>
            <input
              id="gestiones-fecha-hasta"
              type="date"
              value={fechaHasta}
              disabled={!usarRango}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                resetPage();
              }}
              className="w-full rounded-lg border border-stroke px-3 py-2 text-sm disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={usarRango}
                onChange={(e) => {
                  setUsarRango(e.target.checked);
                  resetPage();
                }}
              />
              Filtrar por rango de fechas
            </label>
            {usarRango && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  const hasta = fechaHoyIso();
                  const desde = new Date();
                  desde.setDate(desde.getDate() - 6);
                  setFechaDesde(desde.toISOString().slice(0, 10));
                  setFechaHasta(hasta);
                  resetPage();
                }}
              >
                Últimos 7 días
              </Button>
            )}
          </div>
        </div>
        {usarRango && (
          <p className="mt-3 text-xs text-gray-500">
            En modo rango se listan gestiones por fecha de registro.
          </p>
        )}
      </div>

      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <AsyncPanel
          isLoading={isLoading}
          error={error}
          isEmpty={!gestionesData?.gestiones.length}
          emptyMessage={
            usarRango
              ? 'No hay gestiones en el rango seleccionado.'
              : 'No tienes gestiones programadas para hoy.'
          }
        >
          <PaginatedDataTable
            data={gestionesData?.gestiones ?? []}
            columns={columns}
            pagination={gestionesData}
            isLoading={isLoading}
            emptyMessage={
              usarRango
                ? 'No hay gestiones en el rango seleccionado.'
                : 'No tienes gestiones programadas para hoy.'
            }
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            itemLabel="gestiones"
          />
        </AsyncPanel>
      </div>
    </div>
  );
}
