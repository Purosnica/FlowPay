'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { usePagination } from '@/hooks/use-pagination';
import {
  GET_CAMPANAS,
  CERRAR_CAMPANA,
} from '@/lib/graphql/queries/cobranza.queries';
import type { Campana } from '@/types/cobranza';

export default function CampanasPage() {
  const queryClient = useQueryClient();
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const {
    queryVars,
    resetPage,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination();

  const { data, isLoading, refetch } = useGraphQLQuery<{
    campanas: {
      campanas: Campana[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(
    GET_CAMPANAS,
    { idmandante: idmandante as number, ...queryVars },
    { enabled: typeof idmandante === 'number' },
  );

  const campanasData = data?.campanas;

  const cerrarMutation = useGraphQLMutation(CERRAR_CAMPANA, {
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: [GET_CAMPANAS] });
    },
  });

  const columns = useMemo<ColumnDef<Campana>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Nombre' },
      {
        accessorKey: 'fechaCorte',
        header: 'Fecha corte',
        cell: ({ row }) => row.original.fechaCorte.slice(0, 10),
      },
      { accessorKey: 'estado', header: 'Estado' },
      {
        id: 'acciones',
        header: 'Acciones',
        cell: ({ row }) =>
          row.original.estado === 'ACTIVA' ? (
            <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
              <Button
                size="sm"
                variant="outline"
                disabled={cerrarMutation.isPending}
                onClick={() =>
                  cerrarMutation.mutate({ idcampana: row.original.idcampana })
                }
              >
                Cerrar
              </Button>
            </PermissionGate>
          ) : null,
      },
    ],
    [cerrarMutation],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campañas"
        actions={
          <PermissionGate permiso={PERMISO.CARTERA_WRITE}>
            <Link href="/cobranza/campanas/wizard">
              <Button>Nueva campaña (wizard)</Button>
            </Link>
          </PermissionGate>
        }
      />
      <MandanteSelect
        value={idmandante}
        onChange={(value) => {
          setIdmandante(value);
          resetPage();
        }}
        label=""
        selectClassName="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
      />
      <PaginatedDataTable
        data={campanasData?.campanas ?? []}
        columns={columns}
        pagination={campanasData}
        isLoading={isLoading && typeof idmandante === 'number'}
        emptyMessage={
          idmandante ? 'Sin campañas.' : 'Seleccione un mandante.'
        }
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="campañas"
      />
    </div>
  );
}
