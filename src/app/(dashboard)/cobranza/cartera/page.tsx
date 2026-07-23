'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ViewRowButton } from '@/components/ui/row-action-buttons';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { usePagination } from '@/hooks/use-pagination';
import { useCarteraFiltersPersist } from '@/hooks/use-cartera-filters-persist';
import { useAuth } from '@/contexts/auth-context';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { CarteraFilters } from '@/components/cobranza/cartera-filters';
import { PrestamoForm } from '@/components/cobranza/prestamo-form';
import { PageHeader } from '@/components/ui/page-header';
import { AsyncPanel } from '@/components/ui/async-panel';
import { SearchParamsBoundary } from '@/components/ui/search-params-boundary';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  CREATE_PRESTAMO,
  GET_PRESTAMOS,
} from '@/lib/graphql/queries/cobranza.queries';
import {
  type CreatePrestamoInput,
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
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const [isRegistrarOpen, setIsRegistrarOpen] = useState(false);
  const {
    queryVars,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
  } = usePagination({ initialPageSize: 20 });

  const inicialUrl = useMemo(
    () => filtrosDesdeUrl(searchParams),
    [searchParams],
  );

  const { filters, setFilters, resetFilters } = useCarteraFiltersPersist(
    usuario?.idusuario ?? null,
    inicialUrl,
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

  const createMutation = useGraphQLMutation<
    { createPrestamo: { idprestamo: number } },
    { input: CreatePrestamoInput }
  >(CREATE_PRESTAMO, {
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: [GET_PRESTAMOS] });
      setIsRegistrarOpen(false);
      router.push(`/cobranza/prestamos/${result.createPrestamo.idprestamo}`);
    },
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

  const openRegistrar = () => setIsRegistrarOpen(true);

  const emptyAction = (
    <div className="flex flex-wrap justify-center gap-2">
      <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
        <Button
          size="sm"
          data-ux-id="cartera-empty-registrar"
          onClick={openRegistrar}
        >
          Registrar préstamo
        </Button>
        <Link href="/cobranza/importar">
          <Button
            size="sm"
            variant="outline"
            data-ux-id="cartera-empty-importar"
          >
            Importar cartera
          </Button>
        </Link>
        <Link href="/cobranza/asignacion">
          <Button
            size="sm"
            variant="outline"
            data-ux-id="cartera-empty-asignar"
          >
            Asignar cartera
          </Button>
        </Link>
      </PermissionGate>
    </div>
  );

  return (
    <div className="field-layout space-y-6">
      <PageHeader
        title="Cartera de Cobranza"
        description="Consulta y seguimiento de préstamos por mandante. Los filtros se recuerdan por usuario."
        actions={
          <div className="flex flex-wrap gap-2">
            <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
              <Button
                className="field-touch-target"
                data-ux-id="cartera-registrar"
                onClick={openRegistrar}
              >
                Registrar préstamo
              </Button>
              <Link href="/cobranza/asignacion">
                <Button variant="outline" className="field-touch-target">
                  Asignar cartera
                </Button>
              </Link>
              <Link href="/cobranza/importar">
                <Button variant="outline" className="field-touch-target">
                  Importar cartera
                </Button>
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
          resetFilters();
          resetPage();
        }}
      />

      <div className="rounded-xl border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
        <AsyncPanel
          isLoading={isLoading}
          error={error}
          isEmpty={!isLoading && !error && listaPrestamos.length === 0}
          emptyMessage="No hay préstamos en cartera con estos filtros."
          emptyAction={emptyAction}
        >
          <PaginatedDataTable
            data={listaPrestamos}
            columns={columns}
            pagination={prestamosData}
            isLoading={false}
            emptyMessage="No hay préstamos en cartera. Registre uno o importe un archivo Excel."
            emptyAction={emptyAction}
            onRowClick={(p) =>
              router.push(`/cobranza/prestamos/${p.idprestamo}`)
            }
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
        </AsyncPanel>
      </div>

      <Modal
        isOpen={isRegistrarOpen}
        onClose={() => {
          if (!createMutation.isPending) {
            setIsRegistrarOpen(false);
            createMutation.reset();
          }
        }}
        title="Registrar préstamo"
        size="xl"
        closeOnClickOutside={!createMutation.isPending}
      >
        <PrestamoForm
          initialIdmandante={filters.idmandante}
          isLoading={createMutation.isPending}
          errorMessage={createMutation.error?.message ?? null}
          onCancel={() => {
            setIsRegistrarOpen(false);
            createMutation.reset();
          }}
          onSubmit={(input) => {
            createMutation.mutate({ input });
          }}
        />
      </Modal>
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
