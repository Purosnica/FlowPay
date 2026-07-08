'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { PageHeader } from '@/components/ui/page-header';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { usePagination } from '@/hooks/use-pagination';
import { GET_AGENCIAS, GET_RUTAS } from '@/lib/graphql/queries/cobranza.queries';
import type { Agencia, Ruta } from '@/types/cobranza';

export default function AgenciasPage() {
  const [idagencia, setIdagencia] = useState<number | ''>('');
  const agenciasPagination = usePagination();
  const rutasPagination = usePagination();

  const { data: agenciasData, isLoading: loadingAgencias } = useGraphQLQuery<{
    agencias: {
      agencias: Agencia[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_AGENCIAS, agenciasPagination.queryVars);

  const { data: rutasData, isLoading: loadingRutas } = useGraphQLQuery<{
    rutas: {
      rutas: Ruta[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_RUTAS, {
    idagencia: idagencia || undefined,
    ...rutasPagination.queryVars,
  });

  const agenciaColumns = useMemo<ColumnDef<Agencia>[]>(
    () => [
      { accessorKey: 'codigo', header: 'Código' },
      { accessorKey: 'nombre', header: 'Nombre' },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (row.original.estado ? 'Activa' : 'Inactiva'),
      },
    ],
    [],
  );

  const rutaColumns = useMemo<ColumnDef<Ruta>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Ruta' },
      {
        id: 'agencia',
        header: 'Agencia',
        cell: ({ row }) =>
          row.original.agencia
            ? `${row.original.agencia.codigo} — ${row.original.agencia.nombre}`
            : '-',
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agencias y rutas"
        description="Catálogo creado al importar cartera CREDICOMPRAS."
      />
      <section className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <h2 className="mb-4 font-semibold">Agencias</h2>
        <PaginatedDataTable
          data={agenciasData?.agencias.agencias ?? []}
          columns={agenciaColumns}
          pagination={agenciasData?.agencias}
          isLoading={loadingAgencias}
          emptyMessage="Sin agencias. Importe cartera primero."
          onPageChange={agenciasPagination.handlePageChange}
          onPageSizeChange={agenciasPagination.handlePageSizeChange}
          itemLabel="agencias"
        />
      </section>
      <section className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <h2 className="mb-4 font-semibold">Rutas</h2>
        <select
          value={idagencia}
          onChange={(e) => {
            setIdagencia(e.target.value ? Number(e.target.value) : '');
            rutasPagination.resetPage();
          }}
          className="mb-4 rounded border px-3 py-2 text-sm"
        >
          <option value="">Todas las agencias</option>
          {(agenciasData?.agencias.agencias ?? []).map((a) => (
            <option key={a.idagencia} value={a.idagencia}>
              {a.nombre}
            </option>
          ))}
        </select>
        <PaginatedDataTable
          data={rutasData?.rutas.rutas ?? []}
          columns={rutaColumns}
          pagination={rutasData?.rutas}
          isLoading={loadingRutas}
          emptyMessage="Sin rutas registradas."
          onPageChange={rutasPagination.handlePageChange}
          onPageSizeChange={rutasPagination.handlePageSizeChange}
          itemLabel="rutas"
        />
      </section>
    </div>
  );
}
