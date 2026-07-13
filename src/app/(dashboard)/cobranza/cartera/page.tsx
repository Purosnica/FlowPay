'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ViewRowButton } from '@/components/ui/row-action-buttons';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { usePagination } from '@/hooks/use-pagination';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { CarteraFilters } from '@/components/cobranza/cartera-filters';
import { PageHeader } from '@/components/ui/page-header';
import { SearchParamsBoundary } from '@/components/ui/search-params-boundary';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_PRESTAMOS } from '@/lib/graphql/queries/cobranza.queries';
import {
  type Prestamo,
  type PrestamoFilters,
  formatearMoneda,
  nombreCompletoCliente,
} from '@/types/cobranza';

function filtrosDesdeUrl(searchParams: URLSearchParams): PrestamoFilters {
  const filters: PrestamoFilters = {};
  const estado = searchParams.get('estado');
  if (estado) {
    filters.estado = estado;
  }
  const idmandante = searchParams.get('idmandante');
  if (idmandante) {
    const parsed = Number(idmandante);
    if (!Number.isNaN(parsed)) {
      filters.idmandante = parsed;
    }
  }
  const search = searchParams.get('search');
  if (search) {
    filters.search = search;
  }
  const idgestor = searchParams.get('idgestorAsignado');
  if (idgestor) {
    const parsed = Number(idgestor);
    if (!Number.isNaN(parsed)) {
      filters.idgestorAsignado = parsed;
    }
  }
  return filters;
}

function CarteraPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    queryVars,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
  } = usePagination({ initialPageSize: 20 });
  const [filters, setFilters] = useState<PrestamoFilters>(() =>
    filtrosDesdeUrl(searchParams),
  );

  const { data, isLoading, error } = useGraphQLQuery<{
    prestamos: {
      prestamos: Prestamo[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_PRESTAMOS, {
    ...queryVars,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });

  const prestamosData = data?.prestamos;
  const listaPrestamos = prestamosData?.prestamos ?? [];

  const columns = useMemo<ColumnDef<Prestamo>[]>(
    () => [
      {
        accessorKey: 'noPrestamo',
        header: 'No. Préstamo',
      },
      {
        id: 'cliente',
        header: 'Deudor',
        cell: ({ row }) =>
          row.original.cliente
            ? nombreCompletoCliente(row.original.cliente)
            : '-',
      },
      {
        accessorKey: 'cliente.numerodocumento',
        header: 'Cédula',
        cell: ({ row }) => row.original.cliente?.numerodocumento ?? '-',
      },
      {
        accessorKey: 'mandante.nombre',
        header: 'Mandante',
        cell: ({ row }) => row.original.mandante?.nombre ?? '-',
      },
      {
        accessorKey: 'diasMora',
        header: 'Días mora',
        cell: ({ row }) => {
          const dias = row.original.diasMora;
          return (
            <span
              className={
                dias > 90
                  ? 'font-medium text-red-600'
                  : dias > 30
                    ? 'text-amber-600'
                    : ''
              }
            >
              {dias}
            </span>
          );
        },
      },
      {
        accessorKey: 'saldoTotal',
        header: 'Saldo',
        cell: ({ row }) =>
          formatearMoneda(row.original.saldoTotal, row.original.moneda),
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (
          <span className="rounded-full bg-gray-2 px-2 py-0.5 text-xs dark:bg-dark-2">
            {row.original.estado}
          </span>
        ),
      },
      {
        accessorKey: 'reportableCentralRiesgo',
        header: 'Central Riesgo',
        cell: ({ row }) =>
          row.original.reportableCentralRiesgo ? 'Sí' : 'No (acuerdo)',
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartera de Cobranza"
        description="Consulta y seguimiento de préstamos por mandante"
        actions={
          <div className="flex flex-wrap gap-2">
            <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
              <Link href="/cobranza/asignacion">
                <Button variant="outline">Asignar cartera</Button>
              </Link>
              <Link href="/cobranza/importar">
                <Button variant="outline">Importar cartera</Button>
              </Link>
            </PermissionGate>
          </div>
        }
      />

      <CarteraFilters
        filters={filters}
        onChange={(f) => {
          setFilters(f);
          resetPage();
        }}
        onReset={() => {
          setFilters({});
          resetPage();
        }}
      />

      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error.message}
          </div>
        )}

        <PaginatedDataTable
          data={listaPrestamos}
          columns={columns}
          pagination={prestamosData}
          isLoading={isLoading}
          emptyMessage="No hay préstamos en cartera. Importe un archivo Excel."
          onRowClick={(p) => router.push(`/cobranza/prestamos/${p.idprestamo}`)}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          itemLabel="préstamos"
          rowActions={(p) => (
            <ViewRowButton
              onClick={() =>
                router.push(`/cobranza/prestamos/${p.idprestamo}`)
              }
            />
          )}
        />
      </div>
    </div>
  );
}

export default function CarteraPage() {
  return (
    <SearchParamsBoundary>
      <CarteraPageContent />
    </SearchParamsBoundary>
  );
}
