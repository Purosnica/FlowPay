'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { keepPreviousData } from '@tanstack/react-query';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { BandejaFiltersPanel } from '@/components/cobranza/bandeja-filters';
import { EnviarCobroPanel } from '@/components/cobranza/enviar-cobro-panel';
import { PromesasVencidasPanel } from '@/components/cobranza/promesas-vencidas-panel';
import { GestionRapidaModal } from '@/components/cobranza/gestion-rapida-modal';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { SearchParamsBoundary } from '@/components/ui/search-params-boundary';
import { useDebounce } from '@/hooks/use-debounce';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { usePagination } from '@/hooks/use-pagination';
import {
  GET_BANDEJA_COBRADOR,
  GET_PROMESAS_VENCIDAS,
} from '@/lib/graphql/queries/cobranza.queries';
import { buildPlantillaContextFromPrestamo } from '@/lib/cobranza/plantilla-mensaje-utils';
import {
  type BandejaFilters,
  type BandejaGraphQLItem,
  type Prestamo,
  type PromesaVencida,
 formatearMoneda, nombreCompletoCliente } from '@/types/cobranza';

import { obtenerPresetBandejaPorId } from '@/lib/cobranza/bandeja-presets';

function filtrosDesdeUrl(searchParams: URLSearchParams): BandejaFilters {
  const presetId = searchParams.get('preset');
  if (presetId) {
    const preset = obtenerPresetBandejaPorId(presetId);
    if (preset) {
      return { ...preset.filters };
    }
  }

  const filters: BandejaFilters = {};
  if (searchParams.get('soloPromesaVencida') === '1') {
    filters.soloPromesaVencida = true;
  }
  if (searchParams.get('soloSinGestion') === '1') {
    filters.soloSinGestion = true;
  }
  if (searchParams.get('soloAgendaHoy') === '1') {
    filters.soloAgendaHoy = true;
  }
  return filters;
}

function buildBandejaQueryFilters(
  filters: BandejaFilters,
): BandejaFilters | undefined {
  const cleaned: BandejaFilters = {};

  if (filters.idmandante) {
    cleaned.idmandante = filters.idmandante;
  }
  if (filters.search) {
    cleaned.search = filters.search;
  }
  if (filters.tramoMoraMin !== undefined) {
    cleaned.tramoMoraMin = filters.tramoMoraMin;
    // GraphQL Int no acepta null; omitir max abierto (121+) — el resolver usa gte.
    if (filters.tramoMoraMax != null) {
      cleaned.tramoMoraMax = filters.tramoMoraMax;
    }
  }
  if (filters.ordenarPor) {
    cleaned.ordenarPor = filters.ordenarPor;
  }

  if (filters.soloPromesaVencida) {
    cleaned.soloPromesaVencida = true;
  }
  if (filters.soloAgendaHoy) {
    cleaned.soloAgendaHoy = true;
  }
  if (filters.soloSinGestion) {
    cleaned.soloSinGestion = true;
  }

  if (filters.prioridadMin !== undefined) {
    cleaned.prioridadMin = filters.prioridadMin;
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function bandejaItemToPrestamo(item: BandejaGraphQLItem): Prestamo {
  return {
    idprestamo: item.idprestamo,
    idmandante: item.idmandante,
    idcampana: null,
    idcliente: item.cliente?.idcliente ?? 0,
    noPrestamo: item.noPrestamo,
    codigoUnico: item.noPrestamo,
    noCuenta: null,
    estado: item.estado,
    moneda: item.moneda,
    diasMora: item.diasMora,
    saldoTotal: item.saldoTotal,
    montoPrestamo: item.saldoTotal,
    interes: 0,
    interesMoratorio: 0,
    reportableCentralRiesgo: false,
    fechaPrestamo: null,
    fechaVencimiento: null,
    ultimaFechaPago: null,
    cliente: item.cliente ?? undefined,
    mandante: item.mandante
      ? {
          idmandante: item.idmandante,
          codigo: '',
          nombre: item.mandante.nombre,
          ruc: null,
          regulador: null,
          descuentoMaximo: 0,
          estado: true,
        }
      : undefined,
  };
}

function BandejaPageContent() {
  const searchParams = useSearchParams();
  const [enviarPrestamo, setEnviarPrestamo] = useState<BandejaGraphQLItem | null>(
    null,
  );
  const [gestionRapida, setGestionRapida] = useState<BandejaGraphQLItem | null>(
    null,
  );
  const [filters, setFilters] = useState<BandejaFilters>(() =>
    filtrosDesdeUrl(searchParams),
  );
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const {
    queryVars,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
  } = usePagination({ initialPageSize: 50 });

  const appliedFilters = useMemo<BandejaFilters>(
    () => ({
      ...filters,
      search: debouncedSearch || undefined,
    }),
    [filters, debouncedSearch],
  );

  const bandejaQueryVariables = useMemo(
    () => ({
      ...queryVars,
      filters: buildBandejaQueryFilters(appliedFilters),
    }),
    [queryVars, appliedFilters],
  );

  useEffect(() => {
    resetPage();
  }, [appliedFilters, resetPage]);

  const { data, isLoading, isFetching, error } = useGraphQLQuery<{
    bandejaCobrador: {
      prestamos: BandejaGraphQLItem[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_BANDEJA_COBRADOR, bandejaQueryVariables, {
    placeholderData: keepPreviousData,
  });
  const bandejaData = data?.bandejaCobrador;

  const { data: promesasData, isLoading: promesasLoading } = useGraphQLQuery<{
    promesasVencidas: PromesaVencida[];
  }>(GET_PROMESAS_VENCIDAS, { soloMisAsignados: true, limit: 20 });

  const enviarContext = useMemo(
    () =>
      enviarPrestamo
        ? buildPlantillaContextFromPrestamo(bandejaItemToPrestamo(enviarPrestamo))
        : null,
    [enviarPrestamo],
  );

  const columns = useMemo<ColumnDef<BandejaGraphQLItem>[]>(
    () => [
      { accessorKey: 'noPrestamo', header: 'Préstamo' },
      {
        id: 'prioridad',
        header: 'Prioridad',
        cell: ({ row }) => {
          const score = row.original.scorePrioridad;
          const motivo = row.original.motivoPrioridad;
          if (score == null) {
            return <span className="text-gray-400">—</span>;
          }
          return (
            <div className="max-w-[180px]">
              <span className="font-medium text-primary">{Math.round(score)}</span>
              {motivo && (
                <p className="truncate text-xs text-gray-500" title={motivo}>
                  {motivo}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: 'mandante',
        header: 'Mandante',
        cell: ({ row }) => row.original.mandante?.nombre ?? '-',
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
        accessorKey: 'diasMora',
        header: 'Mora',
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
              {dias} días
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
        id: 'accion',
        header: '',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => setGestionRapida(row.original)}
            >
              Gestión rápida
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEnviarPrestamo(row.original)}
            >
              Enviar cobro
            </Button>
            <Link href={`/cobranza/prestamos/${row.original.idprestamo}`}>
              <Button size="sm" variant="outline">
                Detalle
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [],
  );

  const promesas = promesasData?.promesasVencidas ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi bandeja"
        description="Préstamos asignados a usted con mora activa. Use los filtros para priorizar su gestión."
      />

      {promesas.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="mb-2 font-semibold text-amber-800 dark:text-amber-300">
            Promesas vencidas ({promesas.length})
          </h2>
          <PromesasVencidasPanel
            promesas={promesas}
            isLoading={promesasLoading}
            compact
          />
        </div>
      )}

      <BandejaFiltersPanel
        filters={filters}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onChange={setFilters}
        onReset={() => {
          setFilters({});
          setSearchInput('');
          resetPage();
        }}
      />

      {error && (
        <p className="text-sm text-red-600">Error al cargar la bandeja.</p>
      )}
      <PaginatedDataTable
        data={bandejaData?.prestamos ?? []}
        columns={columns}
        pagination={bandejaData}
        isLoading={isLoading || (isFetching && !bandejaData)}
        emptyMessage="No tiene préstamos asignados que coincidan con los filtros."
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="préstamos"
      />

      <Modal
        isOpen={!!enviarPrestamo}
        onClose={() => setEnviarPrestamo(null)}
        title={
          enviarPrestamo
            ? `Enviar cobro — ${enviarPrestamo.noPrestamo}`
            : 'Enviar cobro'
        }
        size="lg"
      >
        {enviarPrestamo && enviarContext && (
          <EnviarCobroPanel
            idmandante={enviarPrestamo.idmandante}
            idprestamo={enviarPrestamo.idprestamo}
            context={enviarContext}
            compact
          />
        )}
      </Modal>

      {gestionRapida && (
        <GestionRapidaModal
          prestamo={gestionRapida}
          onClose={() => setGestionRapida(null)}
        />
      )}
    </div>
  );
}

export default function BandejaPage() {
  return (
    <SearchParamsBoundary>
      <BandejaPageContent />
    </SearchParamsBoundary>
  );
}
