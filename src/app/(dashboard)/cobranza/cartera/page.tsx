'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { usePagination } from '@/hooks/use-pagination';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { CarteraFilters } from '@/components/cobranza/cartera-filters';
import { PageHeader } from '@/components/ui/page-header';
import { SearchParamsBoundary } from '@/components/ui/search-params-boundary';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_PRESTAMOS,
  GET_USUARIOS_MANDANTE,
  ASIGNAR_GESTOR_PRESTAMO,
  ASIGNAR_GESTOR_MASIVO,
} from '@/lib/graphql/queries/cobranza.queries';
import { type Prestamo, type PrestamoFilters, type UsuarioBasico ,
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
  const {
    queryVars,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
  } = usePagination({ initialPageSize: 20 });
  const [filters, setFilters] = useState<PrestamoFilters>(() =>
    filtrosDesdeUrl(searchParams),
  );
  const [assignModal, setAssignModal] = useState(false);
  const [assignPrestamo, setAssignPrestamo] = useState<Prestamo | undefined>();
  const [bulkModal, setBulkModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [idgestor, setIdgestor] = useState<number | ''>('');

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

  const assignMandanteId =
    assignPrestamo?.idmandante ??
    filters.idmandante ??
    listaPrestamos.find((p) => selectedIds.has(p.idprestamo))?.idmandante ??
    0;

  const { data: usuariosData } = useGraphQLQuery<{
    usuariosMandante: UsuarioBasico[];
  }>(
    GET_USUARIOS_MANDANTE,
    { idmandante: assignMandanteId },
    { enabled: (assignModal || bulkModal) && assignMandanteId > 0 },
  );

  const assignMutation = useGraphQLMutation(ASIGNAR_GESTOR_PRESTAMO, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_PRESTAMOS] });
      setAssignModal(false);
      setAssignPrestamo(undefined);
      setIdgestor('');
    },
  });

  const bulkMutation = useGraphQLMutation(ASIGNAR_GESTOR_MASIVO, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_PRESTAMOS] });
      setBulkModal(false);
      setSelectedIds(new Set());
      setIdgestor('');
    },
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const columns = useMemo<ColumnDef<Prestamo>[]>(
    () => [
      {
        id: 'select',
        header: '',
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.idprestamo)}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleSelect(row.original.idprestamo)}
          />
        ),
      },
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
    [selectedIds],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartera de Cobranza"
        description="Préstamos asignados por mandante"
        actions={
          <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
            <Link href="/cobranza/importar">
              <Button variant="outline">Importar cartera</Button>
            </Link>
          </PermissionGate>
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
          setSelectedIds(new Set());
        }}
      />

      {selectedIds.size > 0 && (
        <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
          <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <span className="text-sm">
              {selectedIds.size} préstamo(s) seleccionado(s)
            </span>
            <Button size="sm" onClick={() => setBulkModal(true)}>
              Asignar gestor masivo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds(new Set())}
            >
              Limpiar
            </Button>
          </div>
        </PermissionGate>
      )}

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
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAssignPrestamo(p);
                  setAssignModal(true);
                }}
              >
                Asignar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  router.push(`/cobranza/prestamos/${p.idprestamo}`)
                }
              >
                Ver
              </Button>
            </div>
          )}
        />
      </div>

      <Modal
        isOpen={assignModal}
        onClose={() => {
          setAssignModal(false);
          setAssignPrestamo(undefined);
        }}
        title={`Asignar gestor — ${assignPrestamo?.noPrestamo ?? ''}`}
        size="md"
      >
        <div className="space-y-3">
          <select
            value={idgestor}
            onChange={(e) =>
              setIdgestor(e.target.value ? Number(e.target.value) : '')
            }
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Seleccionar gestor...</option>
            {(usuariosData?.usuariosMandante ?? []).map((u) => (
              <option key={u.idusuario} value={u.idusuario}>
                {u.nombre}
              </option>
            ))}
          </select>
          <Button
            disabled={!idgestor || !assignPrestamo || assignMutation.isPending}
            onClick={() => {
              if (assignPrestamo && idgestor) {
                assignMutation.mutate({
                  idprestamo: assignPrestamo.idprestamo,
                  idgestor,
                });
              }
            }}
          >
            Asignar gestor
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={bulkModal}
        onClose={() => setBulkModal(false)}
        title={`Asignar gestor — ${selectedIds.size} préstamos`}
        size="md"
      >
        <div className="space-y-3">
          <select
            value={idgestor}
            onChange={(e) =>
              setIdgestor(e.target.value ? Number(e.target.value) : '')
            }
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Seleccionar gestor...</option>
            {(usuariosData?.usuariosMandante ?? []).map((u) => (
              <option key={u.idusuario} value={u.idusuario}>
                {u.nombre}
              </option>
            ))}
          </select>
          <Button
            disabled={
              !idgestor || selectedIds.size === 0 || bulkMutation.isPending
            }
            onClick={() => {
              if (idgestor) {
                bulkMutation.mutate({
                  idprestamos: Array.from(selectedIds),
                  idgestor,
                });
              }
            }}
          >
            Asignar a {selectedIds.size} préstamos
          </Button>
        </div>
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
