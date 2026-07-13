'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { usePaginatedPanel } from '@/hooks/use-paginated-panel';
import { Button } from '@/components/ui/button';
import {
  DeleteRowButton,
  EditRowButton,
} from '@/components/ui/row-action-buttons';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_POLITICAS_DESCUENTO,
  CREATE_POLITICA_DESCUENTO,
  UPDATE_POLITICA_DESCUENTO,
  DELETE_POLITICA_DESCUENTO,
} from '@/lib/graphql/queries/cobranza.queries';
import type { Mandante, PoliticaDescuento } from '@/types/cobranza';

interface PoliticaDescuentoPanelProps {
  mandante: Mandante;
}

const emptyForm = {
  tramoMoraMin: 0,
  tramoMoraMax: null as number | null,
  porcentaje: 5,
  estado: true,
};

export function PoliticaDescuentoPanel({ mandante }: PoliticaDescuentoPanelProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<PoliticaDescuento | null>(null);

  const { queryVars, handlePageChange, handlePageSizeChange } =
    usePaginatedPanel({
      scopeKey: mandante.idmandante,
      initialPageSize: 10,
    });

  const { data, isLoading } = useGraphQLQuery<{
    politicasDescuento: {
      politicas: PoliticaDescuento[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_POLITICAS_DESCUENTO, {
    idmandante: mandante.idmandante,
    ...queryVars,
  });

  const pageData = data?.politicasDescuento;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [GET_POLITICAS_DESCUENTO] });

  const createMutation = useGraphQLMutation(CREATE_POLITICA_DESCUENTO, {
    onSuccess: () => {
      invalidate();
      setForm(emptyForm);
    },
  });
  const updateMutation = useGraphQLMutation(UPDATE_POLITICA_DESCUENTO, {
    onSuccess: () => {
      invalidate();
      setEditing(null);
      setForm(emptyForm);
    },
  });
  const deleteMutation = useGraphQLMutation(DELETE_POLITICA_DESCUENTO, {
    onSuccess: invalidate,
  });

  const columns = useMemo<ColumnDef<PoliticaDescuento>[]>(
    () => [
      { accessorKey: 'tramoMoraMin', header: 'Mora mín' },
      {
        accessorKey: 'tramoMoraMax',
        header: 'Mora máx',
        cell: ({ row }) => row.original.tramoMoraMax ?? '∞',
      },
      {
        accessorKey: 'porcentaje',
        header: '% máx descuento',
        cell: ({ row }) => `${row.original.porcentaje}%`,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Límites de descuento en acuerdos según días de mora ({mandante.nombre}).
      </p>
      <form
        className="grid gap-3 rounded-lg border p-4 dark:border-dark-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (editing) {
            updateMutation.mutate({
              input: {
                idpolitica: editing.idpolitica,
                ...form,
              },
            });
          } else {
            createMutation.mutate({
              input: { idmandante: mandante.idmandante, ...form },
            });
          }
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="number"
            min={0}
            required
            placeholder="Mora mín"
            value={form.tramoMoraMin}
            onChange={(e) =>
              setForm((f) => ({ ...f, tramoMoraMin: Number(e.target.value) }))
            }
            className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
          />
          <input
            type="number"
            min={0}
            placeholder="Mora máx"
            value={form.tramoMoraMax ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                tramoMoraMax: e.target.value ? Number(e.target.value) : null,
              }))
            }
            className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
          />
          <input
            type="number"
            min={0}
            max={100}
            required
            placeholder="% descuento"
            value={form.porcentaje}
            onChange={(e) =>
              setForm((f) => ({ ...f, porcentaje: Number(e.target.value) }))
            }
            className="rounded border px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
          />
        </div>
        <Button type="submit">
          {editing ? 'Guardar política' : 'Agregar política'}
        </Button>
      </form>
      <PaginatedDataTable
        data={pageData?.politicas ?? []}
        columns={columns}
        pagination={pageData}
        isLoading={isLoading}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="políticas"
        rowActions={(p) => (
          <div className="flex gap-2">
            <EditRowButton
              onClick={() => {
                setEditing(p);
                setForm({
                  tramoMoraMin: p.tramoMoraMin,
                  tramoMoraMax: p.tramoMoraMax,
                  porcentaje: p.porcentaje,
                  estado: p.estado,
                });
              }}
            />
            <DeleteRowButton
              onClick={() =>
                deleteMutation.mutate({ idpolitica: p.idpolitica })
              }
            />
          </div>
        )}
      />
    </div>
  );
}
