'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DeleteRowButton } from '@/components/ui/row-action-buttons';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { usePaginatedPanel } from '@/hooks/use-paginated-panel';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_CONTRATOS_MANDANTE,
  CREATE_CONTRATO_MANDANTE,
  UPDATE_CONTRATO_MANDANTE,
  DELETE_CONTRATO_MANDANTE,
} from '@/lib/graphql/queries/cobranza.queries';
import type { ContratoMandante, Mandante } from '@/types/cobranza';

interface ContratoMandantePanelProps {
  mandante: Mandante;
}

export function ContratoMandantePanel({ mandante }: ContratoMandantePanelProps) {
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [fechaFin, setFechaFin] = useState('');
  const [permitePago, setPermitePago] = useState(true);

  const { queryVars, handlePageChange, handlePageSizeChange } =
    usePaginatedPanel({
      scopeKey: mandante.idmandante,
      initialPageSize: 10,
    });

  const { data, refetch, isLoading } = useGraphQLQuery<{
    contratosMandante: {
      contratos: ContratoMandante[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_CONTRATOS_MANDANTE, {
    idmandante: mandante.idmandante,
    ...queryVars,
  });

  const pageData = data?.contratosMandante;

  const createMutation = useGraphQLMutation(CREATE_CONTRATO_MANDANTE, {
    onSuccess: () => refetch(),
  });

  const updateMutation = useGraphQLMutation(UPDATE_CONTRATO_MANDANTE, {
    onSuccess: () => refetch(),
  });

  const deleteMutation = useGraphQLMutation(DELETE_CONTRATO_MANDANTE, {
    onSuccess: () => refetch(),
  });

  const columns = useMemo<ColumnDef<ContratoMandante>[]>(
    () => [
      {
        accessorKey: 'fechaInicio',
        header: 'Inicio',
        cell: ({ row }) =>
          new Date(row.original.fechaInicio).toLocaleDateString('es-NI'),
      },
      {
        accessorKey: 'fechaFin',
        header: 'Fin',
        cell: ({ row }) =>
          row.original.fechaFin
            ? new Date(row.original.fechaFin).toLocaleDateString('es-NI')
            : 'Vigente',
      },
      {
        accessorKey: 'permitePagoAnticipado',
        header: 'Pago anticipado',
        cell: ({ row }) => (row.original.permitePagoAnticipado ? 'Sí' : 'No'),
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (row.original.estado ? 'Activo' : 'Inactivo'),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <form
        className="grid gap-2 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate({
            input: {
              idmandante: mandante.idmandante,
              fechaInicio: new Date(fechaInicio).toISOString(),
              fechaFin: fechaFin
                ? new Date(fechaFin).toISOString()
                : undefined,
              permitePagoAnticipado: permitePago,
            },
          });
        }}
      >
        <input
          type="date"
          required
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          placeholder="Fin (opcional)"
          className="rounded border px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={permitePago}
            onChange={(e) => setPermitePago(e.target.checked)}
          />
          Pago anticipado
        </label>
        <Button type="submit" disabled={createMutation.isPending}>
          Agregar contrato
        </Button>
      </form>
      <PaginatedDataTable
        data={pageData?.contratos ?? []}
        columns={columns}
        pagination={pageData}
        isLoading={isLoading}
        emptyMessage="Sin contratos."
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="contratos"
        rowActions={(c) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                updateMutation.mutate({
                  input: {
                    idcontrato: c.idcontrato,
                    estado: !c.estado,
                  },
                })
              }
            >
              {c.estado ? 'Desactivar' : 'Activar'}
            </Button>
            <DeleteRowButton
              onClick={() =>
                deleteMutation.mutate({ idcontrato: c.idcontrato })
              }
            />
          </div>
        )}
      />
    </div>
  );
}
