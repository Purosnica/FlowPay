'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { usePaginatedPanel } from '@/hooks/use-paginated-panel';
import {
  GET_HORARIOS_COBRANZA,
  UPDATE_HORARIO_COBRANZA,
} from '@/lib/graphql/queries/cobranza.queries';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import type { HorarioCobranza, Mandante } from '@/types/cobranza';

const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface HorarioCobranzaPanelProps {
  mandante?: Mandante;
}

export function HorarioCobranzaPanel({ mandante }: HorarioCobranzaPanelProps) {
  const scopeKey = mandante?.idmandante ?? 'global';
  const { queryVars, handlePageChange, handlePageSizeChange } =
    usePaginatedPanel({ scopeKey, initialPageSize: 10 });

  const { data, refetch, isLoading } = useGraphQLQuery<{
    horariosCobranza: {
      horarios: HorarioCobranza[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_HORARIOS_COBRANZA, {
    idmandante: mandante?.idmandante,
    ...queryVars,
  });

  const pageData = data?.horariosCobranza;

  const updateMutation = useGraphQLMutation(UPDATE_HORARIO_COBRANZA, {
    onSuccess: () => refetch(),
  });

  const columns = useMemo<ColumnDef<HorarioCobranza>[]>(
    () => [
      {
        accessorKey: 'diaSemana',
        header: 'Día',
        cell: ({ row }) => DIAS[row.original.diaSemana] ?? row.original.diaSemana,
      },
      { accessorKey: 'horaInicio', header: 'Inicio' },
      { accessorKey: 'horaFin', header: 'Fin' },
      {
        accessorKey: 'permitido',
        header: 'Permitido',
        cell: ({ row }) => (row.original.permitido ? 'Sí' : 'No'),
      },
      {
        id: 'toggle',
        header: '',
        cell: ({ row }) => (
          <PermissionGate permiso={PERMISO.MANDANTE_WRITE}>
            <Button
              size="sm"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() =>
                updateMutation.mutate({
                  idhorario: row.original.idhorario,
                  permitido: !row.original.permitido,
                })
              }
            >
              {row.original.permitido ? 'Bloquear' : 'Permitir'}
            </Button>
          </PermissionGate>
        ),
      },
    ],
    [updateMutation],
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Horarios de contacto CONAMI
        {mandante ? ` — ${mandante.nombre}` : ' (regulador)'}.
      </p>
      <PaginatedDataTable
        data={pageData?.horarios ?? []}
        columns={columns}
        pagination={pageData}
        isLoading={isLoading}
        emptyMessage="Sin horarios configurados."
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="horarios"
      />
    </div>
  );
}
