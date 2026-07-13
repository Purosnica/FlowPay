'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DeleteRowButton } from '@/components/ui/row-action-buttons';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { usePaginatedPanel } from '@/hooks/use-paginated-panel';
import {
  GET_FIADORES,
  CREATE_FIADOR,
  DELETE_FIADOR,
} from '@/lib/graphql/queries/cobranza.queries';
import type { Fiador } from '@/types/cobranza';
import type { ColumnDef } from '@tanstack/react-table';

interface FiadorPanelProps {
  idprestamo: number;
}

export function FiadorPanel({ idprestamo }: FiadorPanelProps) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipo, setTipo] = useState('FIADOR');

  const { queryVars, handlePageChange, handlePageSizeChange } =
    usePaginatedPanel({ scopeKey: idprestamo, initialPageSize: 10 });

  const { data, refetch, isLoading } = useGraphQLQuery<{
    fiadores: {
      fiadores: Fiador[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_FIADORES, { idprestamo, ...queryVars });

  const pageData = data?.fiadores;

  const createMutation = useGraphQLMutation(CREATE_FIADOR, {
    onSuccess: () => {
      refetch();
      setNombre('');
      setTelefono('');
    },
  });

  const deleteMutation = useGraphQLMutation(DELETE_FIADOR, {
    onSuccess: () => refetch(),
  });

  const columns: ColumnDef<Fiador>[] = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'telefono', header: 'Teléfono' },
    { accessorKey: 'tipo', header: 'Tipo' },
  ];

  return (
    <div className="space-y-4">
      <form
        className="grid gap-2 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nombre.trim()) {
            return;
          }
          createMutation.mutate({
            input: {
              idprestamo,
              nombre: nombre.trim(),
              telefono: telefono || undefined,
              tipo,
            },
          });
        }}
      >
        <input
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        />
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Teléfono"
          className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        >
          <option value="FIADOR">Fiador</option>
          <option value="CODEUDOR">Codeudor</option>
          <option value="REFERENCIA">Referencia</option>
          <option value="EMERGENCIA">Emergencia</option>
        </select>
        <Button type="submit" disabled={createMutation.isPending}>
          Agregar
        </Button>
      </form>
      <PaginatedDataTable
        data={pageData?.fiadores ?? []}
        columns={columns}
        pagination={pageData}
        isLoading={isLoading}
        emptyMessage="Sin fiadores registrados."
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="fiadores"
        rowActions={(f) => (
          <DeleteRowButton
            onClick={() => deleteMutation.mutate({ idfiador: f.idfiador })}
          />
        )}
      />
    </div>
  );
}
