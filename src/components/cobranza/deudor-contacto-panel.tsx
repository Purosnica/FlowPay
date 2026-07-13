'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DeleteRowButton } from '@/components/ui/row-action-buttons';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { usePaginatedPanel } from '@/hooks/use-paginated-panel';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_DEUDORES_CONTACTO,
  CREATE_DEUDOR_CONTACTO,
  UPDATE_DEUDOR_CONTACTO,
  DELETE_DEUDOR_CONTACTO,
} from '@/lib/graphql/queries/cobranza.queries';
import type { DeudorContacto } from '@/types/cobranza';
import type { ColumnDef } from '@tanstack/react-table';

interface DeudorContactoPanelProps {
  idcliente: number;
}

export function DeudorContactoPanel({ idcliente }: DeudorContactoPanelProps) {
  const [tipo, setTipo] = useState('CELULAR');
  const [valor, setValor] = useState('');

  const { queryVars, handlePageChange, handlePageSizeChange } =
    usePaginatedPanel({ scopeKey: idcliente, initialPageSize: 10 });

  const { data, refetch, isLoading } = useGraphQLQuery<{
    deudoresContacto: {
      contactos: DeudorContacto[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_DEUDORES_CONTACTO, { idcliente, ...queryVars });

  const pageData = data?.deudoresContacto;

  const createMutation = useGraphQLMutation(CREATE_DEUDOR_CONTACTO, {
    onSuccess: () => {
      refetch();
      setValor('');
    },
  });

  const updateMutation = useGraphQLMutation(UPDATE_DEUDOR_CONTACTO, {
    onSuccess: () => refetch(),
  });

  const deleteMutation = useGraphQLMutation(DELETE_DEUDOR_CONTACTO, {
    onSuccess: () => refetch(),
  });

  const columns: ColumnDef<DeudorContacto>[] = [
    { accessorKey: 'tipo', header: 'Tipo' },
    { accessorKey: 'valor', header: 'Valor' },
    { accessorKey: 'fuente', header: 'Fuente' },
    {
      id: 'autorizado',
      header: 'Autorizado',
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.original.autorizado}
          disabled={updateMutation.isPending}
          onChange={() =>
            updateMutation.mutate({
              input: {
                idcontacto: row.original.idcontacto,
                autorizado: !row.original.autorizado,
              },
            })
          }
        />
      ),
    },
    {
      id: 'noContactar',
      header: 'No contactar',
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.original.noContactar}
          disabled={updateMutation.isPending}
          onChange={() =>
            updateMutation.mutate({
              input: {
                idcontacto: row.original.idcontacto,
                noContactar: !row.original.noContactar,
              },
            })
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Contactos del deudor (Ley 787). Solo marque autorizado si el deudor
        consintió el contacto.
      </p>
      <form
        className="grid gap-2 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valor.trim()) {
            return;
          }
          createMutation.mutate({
            input: { idcliente, tipo, valor: valor.trim() },
          });
        }}
      >
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        >
          <option value="CELULAR">Celular</option>
          <option value="TELEFONO">Teléfono</option>
          <option value="EMAIL">Email</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
        <input
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Número o email"
          className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        />
        <Button type="submit" disabled={createMutation.isPending}>
          Agregar
        </Button>
      </form>
      <PaginatedDataTable
        data={pageData?.contactos ?? []}
        columns={columns}
        pagination={pageData}
        isLoading={isLoading}
        emptyMessage="Sin contactos registrados."
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="contactos"
        rowActions={(c) => (
          <DeleteRowButton
            onClick={() =>
              deleteMutation.mutate({ idcontacto: c.idcontacto })
            }
          />
        )}
      />
    </div>
  );
}
