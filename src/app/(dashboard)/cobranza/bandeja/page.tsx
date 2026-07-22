'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { keepPreviousData } from '@tanstack/react-query';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { BandejaFiltersPanel } from '@/components/cobranza/bandeja-filters';
import { EnviarCobroPanel } from '@/components/cobranza/enviar-cobro-panel';
import { PromesasVencidasPanel } from '@/components/cobranza/promesas-vencidas-panel';
import { GestionRapidaModal } from '@/components/cobranza/gestion-rapida-modal';
import { PagoRapidaModal } from '@/components/cobranza/pago-rapida-modal';
import { EstacionCasoPanel } from '@/components/cobranza/estacion-caso-panel';
import { OperacionHotkeysHelp } from '@/components/cobranza/operacion-hotkeys-help';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { SearchParamsBoundary } from '@/components/ui/search-params-boundary';
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from '@/components/ui/dropdown';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { useDebounce } from '@/hooks/use-debounce';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { usePagination } from '@/hooks/use-pagination';
import { usePuede } from '@/hooks/use-permisos';
import { useColaOperativa } from '@/hooks/use-cola-operativa';
import {
  GET_BANDEJA_COBRADOR,
  GET_PROMESAS_VENCIDAS,
} from '@/lib/graphql/queries/cobranza.queries';
import { buildPlantillaContextFromPrestamo } from '@/lib/cobranza/plantilla-mensaje-utils';
import {
  filtrosBandejaDesdeSearchParams,
  searchParamsDesdeFiltrosBandeja,
} from '@/lib/logic/bandeja-url-filters-logic';
import { notificationToast } from '@/lib/notifications/notification-toast';
import { mensajeAvanceOperativo } from '@/lib/logic/avance-operativo-feedback-logic';
import {
  type BandejaFilters,
  type BandejaGraphQLItem,
  type Prestamo,
  type PromesaVencida,
  formatearMoneda,
  nombreCompletoCliente,
} from '@/types/cobranza';
import { cn } from '@/lib/utils';

const ATAJOS_BANDEJA = [
  { keys: 'J / K', descripcion: 'Caso anterior / siguiente' },
  { keys: 'P', descripcion: 'Pago rápido del caso seleccionado' },
  { keys: 'G', descripcion: 'Tipificar el caso seleccionado' },
  { keys: 'N', descripcion: 'Abrir detalle del caso seleccionado' },
  { keys: 'M', descripcion: 'Ir a Mi día' },
  { keys: '?', descripcion: 'Mostrar esta ayuda' },
];

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

function BandejaAccionesFila({
  item,
  onPago,
  onGestion,
  onEnviar,
}: {
  item: BandejaGraphQLItem;
  onPago: () => void;
  onGestion: () => void;
  onEnviar: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PermissionGate permiso={PERMISO.PAGO_WRITE}>
        <Button
          size="sm"
          data-ux-id="bandeja-pago-rapido"
          onClick={(e) => {
            e.stopPropagation();
            onPago();
          }}
        >
          Registrar pago
        </Button>
      </PermissionGate>
      <PermissionGate permiso={PERMISO.GESTION_WRITE}>
        <Button
          size="sm"
          variant="outline"
          data-ux-id="bandeja-gestion-rapida"
          onClick={(e) => {
            e.stopPropagation();
            onGestion();
          }}
        >
          Tipificar
        </Button>
      </PermissionGate>
      <Dropdown isOpen={menuOpen} setIsOpen={setMenuOpen}>
        <DropdownTrigger
          aria-label="Más acciones"
          className="inline-flex h-8 items-center rounded-md border border-stroke px-2 text-sm dark:border-dark-3"
          onClick={(e) => e.stopPropagation()}
        >
          ⋯
        </DropdownTrigger>
        <DropdownContent className="min-w-[160px] border border-stroke bg-white p-1 shadow-lg dark:border-dark-3 dark:bg-gray-dark">
          <PermissionGate permiso={PERMISO.GESTION_WRITE}>
            <button
              type="button"
              className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-2 dark:hover:bg-dark-2"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onEnviar();
              }}
            >
              Enviar cobro
            </button>
          </PermissionGate>
          <Link
            href={`/cobranza/prestamos/${item.idprestamo}`}
            className="block rounded px-3 py-2 text-sm hover:bg-gray-2 dark:hover:bg-dark-2"
            onClick={(e) => e.stopPropagation()}
          >
            Detalle
          </Link>
        </DropdownContent>
      </Dropdown>
    </div>
  );
}

function BandejaPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const puedeGestion = usePuede(PERMISO.GESTION_WRITE);
  const puedePago = usePuede(PERMISO.PAGO_WRITE);
  const [enviarPrestamo, setEnviarPrestamo] = useState<BandejaGraphQLItem | null>(
    null,
  );
  const [gestionRapida, setGestionRapida] = useState<BandejaGraphQLItem | null>(
    null,
  );
  const [pagoRapido, setPagoRapido] = useState<BandejaGraphQLItem | null>(
    null,
  );
  const [filters, setFilters] = useState<BandejaFilters>(() =>
    filtrosBandejaDesdeSearchParams(searchParams),
  );
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get('search') ?? '',
  );
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

  const syncUrl = useCallback(
    (nextFilters: BandejaFilters, nextSearch: string) => {
      const params = searchParamsDesdeFiltrosBandeja(nextFilters, nextSearch);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const handleFiltersChange = useCallback(
    (next: BandejaFilters) => {
      setFilters(next);
      syncUrl(next, searchInput);
    },
    [searchInput, syncUrl],
  );

  useEffect(() => {
    syncUrl(filters, debouncedSearch);
    // Solo al estabilizar la búsqueda tipada.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync búsqueda debounceada
  }, [debouncedSearch]);

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
  const prestamos = bandejaData?.prestamos ?? [];

  const {
    selectedIndex,
    setSelectedIndex,
    casoSeleccionado: itemSeleccionado,
    avanzarTrasId,
    mover,
  } = useColaOperativa(prestamos);

  useEffect(() => {
    const el = document.querySelector(
      `[data-caso-id="${itemSeleccionado?.idprestamo ?? ''}"]`,
    );
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [itemSeleccionado?.idprestamo]);

  const notificarAvance = (
    accion: 'gestion' | 'pago',
    next: BandejaGraphQLItem | null,
  ) => {
    const idx = next
      ? prestamos.findIndex((p) => p.idprestamo === next.idprestamo)
      : -1;
    notificationToast.success(
      mensajeAvanceOperativo({
        accion,
        haySiguiente: Boolean(next),
        posicionSiguiente: idx >= 0 ? idx + 1 : undefined,
        total: prestamos.length,
      }),
    );
  };

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
          <BandejaAccionesFila
            item={row.original}
            onPago={() => {
              setSelectedIndex(row.index);
              setPagoRapido(row.original);
            }}
            onGestion={() => {
              setSelectedIndex(row.index);
              setGestionRapida(row.original);
            }}
            onEnviar={() => {
              setSelectedIndex(row.index);
              setEnviarPrestamo(row.original);
            }}
          />
        ),
      },
    ],
    [],
  );

  const promesas = promesasData?.promesasVencidas ?? [];
  const mostrarPanelPromesas =
    promesas.length > 0 && !filters.soloPromesaVencida;

  const hotkeys = useMemo(
    () => [
      {
        key: 'j',
        enabled: prestamos.length > 0,
        handler: () => mover(1),
      },
      {
        key: 'k',
        enabled: prestamos.length > 0,
        handler: () => mover(-1),
      },
      {
        key: 'p',
        enabled: puedePago && Boolean(itemSeleccionado),
        handler: () => {
          if (itemSeleccionado) {
            setPagoRapido(itemSeleccionado);
          }
        },
      },
      {
        key: 'g',
        enabled: puedeGestion && Boolean(itemSeleccionado),
        handler: () => {
          if (itemSeleccionado) {
            setGestionRapida(itemSeleccionado);
          }
        },
      },
      {
        key: 'n',
        enabled: Boolean(itemSeleccionado),
        handler: () => {
          if (itemSeleccionado) {
            router.push(`/cobranza/prestamos/${itemSeleccionado.idprestamo}`);
          }
        },
      },
      {
        key: 'm',
        handler: () => router.push('/cobranza/mi-dia'),
      },
    ],
    [puedeGestion, puedePago, itemSeleccionado, router, prestamos.length, mover],
  );

  useHotkeys(hotkeys);

  return (
    <div className="field-layout space-y-6">
      <OperacionHotkeysHelp atajos={ATAJOS_BANDEJA} />
      <PageHeader
        title="Mi bandeja"
        description="Préstamos asignados con mora activa. Atajos: J/K · G tipificar · P pago · N detalle · M Mi día · ?"
      />

      {mostrarPanelPromesas && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-amber-800 dark:text-amber-300">
              Promesas vencidas ({promesas.length})
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handleFiltersChange({
                  ...filters,
                  soloPromesaVencida: true,
                })
              }
            >
              Filtrar bandeja
            </Button>
          </div>
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
        onChange={handleFiltersChange}
        onReset={() => {
          setFilters({});
          setSearchInput('');
          resetPage();
          syncUrl({}, '');
        }}
      />

      {error && (
        <p className="text-sm text-red-600" role="alert">
          Error al cargar la bandeja.
        </p>
      )}
      <div
        className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]"
        data-ux-id="estacion-bandeja"
      >
        <div
          className={cn(
            'rounded-lg',
            itemSeleccionado && 'ring-1 ring-primary/20',
          )}
        >
          <PaginatedDataTable
            data={prestamos}
            columns={columns}
            pagination={bandejaData}
            isLoading={isLoading || (isFetching && !bandejaData)}
            emptyMessage="No tiene préstamos asignados que coincidan con los filtros."
            emptyAction={
              <Link href="/cobranza/mi-dia">
                <Button size="sm">Ir a Mi día</Button>
              </Link>
            }
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            itemLabel="préstamos"
            onRowClick={(row) => {
              const idx = prestamos.findIndex(
                (p) => p.idprestamo === row.idprestamo,
              );
              if (idx >= 0) {
                setSelectedIndex(idx);
              }
            }}
            getRowClassName={(_row, index) =>
              index === selectedIndex
                ? 'bg-primary/5 dark:bg-primary/10'
                : undefined
            }
            getRowAttrs={(row, index) => ({
              'data-caso-id': row.idprestamo,
              'aria-selected': index === selectedIndex,
            })}
          />
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <EstacionCasoPanel
            caso={
              itemSeleccionado
                ? {
                    idprestamo: itemSeleccionado.idprestamo,
                    noPrestamo: itemSeleccionado.noPrestamo,
                    nombreCliente: itemSeleccionado.cliente
                      ? nombreCompletoCliente(itemSeleccionado.cliente)
                      : '—',
                    saldoTotal: itemSeleccionado.saldoTotal,
                    diasMora: itemSeleccionado.diasMora,
                    moneda: itemSeleccionado.moneda,
                    telefono:
                      itemSeleccionado.cliente?.celular ??
                      itemSeleccionado.cliente?.telefono ??
                      null,
                    motivoPrioridad: itemSeleccionado.motivoPrioridad,
                    scorePrioridad: itemSeleccionado.scorePrioridad,
                  }
                : null
            }
            posicion={selectedIndex + 1}
            total={prestamos.length}
            puedeGestion={puedeGestion}
            puedePago={puedePago}
            mostrarLinkBandeja={false}
            onTipificar={() => {
              if (itemSeleccionado) {
                setGestionRapida(itemSeleccionado);
              }
            }}
            onPago={() => {
              if (itemSeleccionado) {
                setPagoRapido(itemSeleccionado);
              }
            }}
          />
        </div>
      </div>

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
          key={`ges-${gestionRapida.idprestamo}`}
          prestamo={gestionRapida}
          onClose={() => setGestionRapida(null)}
          onSuccess={() => {
            const next = avanzarTrasId(gestionRapida.idprestamo);
            notificarAvance('gestion', next);
            if (!next) {
              return;
            }
            setGestionRapida(next);
            return false;
          }}
        />
      )}
      {pagoRapido && (
        <PagoRapidaModal
          key={`pago-${pagoRapido.idprestamo}`}
          prestamo={pagoRapido}
          onClose={() => setPagoRapido(null)}
          onSuccess={() => {
            const next = avanzarTrasId(pagoRapido.idprestamo);
            notificarAvance('pago', next);
            if (!next) {
              return;
            }
            setPagoRapido(next);
            return false;
          }}
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
