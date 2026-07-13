'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DeleteRowButton,
  EditRowButton,
} from '@/components/ui/row-action-buttons';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { usePaginatedPanel } from '@/hooks/use-paginated-panel';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_COMISIONES_COBRO,
  CREATE_COMISION_COBRO,
  UPDATE_COMISION_COBRO,
  DELETE_COMISION_COBRO,
} from '@/lib/graphql/queries/cobranza.queries';
import type { ComisionCobro, Mandante } from '@/types/cobranza';

export interface ComisionFormData {
  tramoMoraMin: number;
  tramoMoraMax: number | null;
  porcentaje: number;
  estado: boolean;
}

interface ComisionCobroPanelProps {
  mandante: Mandante;
  onClose?: () => void;
}

const emptyForm: ComisionFormData = {
  tramoMoraMin: 0,
  tramoMoraMax: null,
  porcentaje: 10,
  estado: true,
};

export function ComisionCobroPanel({
  mandante,
  onClose,
}: ComisionCobroPanelProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ComisionFormData>(emptyForm);
  const [editing, setEditing] = useState<ComisionCobro | null>(null);

  const { queryVars, handlePageChange, handlePageSizeChange } =
    usePaginatedPanel({
      scopeKey: mandante.idmandante,
      initialPageSize: 10,
    });

  const { data, isLoading, error } = useGraphQLQuery<{
    comisionesCobro: {
      comisiones: ComisionCobro[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>(GET_COMISIONES_COBRO, {
    idmandante: mandante.idmandante,
    ...queryVars,
  });

  const pageData = data?.comisionesCobro;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [GET_COMISIONES_COBRO] });
  };

  const createMutation = useGraphQLMutation(CREATE_COMISION_COBRO, {
    onSuccess: () => {
      invalidate();
      setForm(emptyForm);
    },
  });

  const updateMutation = useGraphQLMutation(UPDATE_COMISION_COBRO, {
    onSuccess: () => {
      invalidate();
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useGraphQLMutation(DELETE_COMISION_COBRO, {
    onSuccess: () => invalidate(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({
        input: {
          idcomision: editing.idcomision,
          tramoMoraMin: form.tramoMoraMin,
          tramoMoraMax: form.tramoMoraMax,
          porcentaje: form.porcentaje,
          estado: form.estado,
        },
      });
    } else {
      createMutation.mutate({
        input: {
          idmandante: mandante.idmandante,
          tramoMoraMin: form.tramoMoraMin,
          tramoMoraMax: form.tramoMoraMax,
          porcentaje: form.porcentaje,
          estado: form.estado,
        },
      });
    }
  };

  const columns = useMemo<ColumnDef<ComisionCobro>[]>(
    () => [
      {
        accessorKey: 'tramoMoraMin',
        header: 'Mora mín (días)',
      },
      {
        accessorKey: 'tramoMoraMax',
        header: 'Mora máx (días)',
        cell: ({ row }) => row.original.tramoMoraMax ?? '∞',
      },
      {
        accessorKey: 'porcentaje',
        header: '% recuperación',
        cell: ({ row }) => `${row.original.porcentaje}%`,
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (row.original.estado ? 'Activo' : 'Inactivo'),
      },
    ],
    [],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Tramos de % de recuperación para la empresa según días de mora del
        préstamo al momento del pago ({mandante.nombre}). La comisión del
        cobrador se calcula sobre ese ingreso.
      </p>

      {error && (
        <p className="text-sm text-red-600">
          No se pudieron cargar las comisiones.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-lg border border-stroke p-4 dark:border-dark-3"
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium">
              Mora mínima
            </label>
            <input
              type="number"
              min={0}
              required
              value={form.tramoMoraMin}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tramoMoraMin: Number(e.target.value),
                }))
              }
              className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              Mora máxima
            </label>
            <input
              type="number"
              min={0}
              value={form.tramoMoraMax ?? ''}
              placeholder="Sin tope"
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tramoMoraMax: e.target.value
                    ? Number(e.target.value)
                    : null,
                }))
              }
              className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              % recuperación empresa
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              required
              value={form.porcentaje}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  porcentaje: Number(e.target.value),
                }))
              }
              className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.estado}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estado: e.target.checked }))
                }
              />
              Activo
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSaving}>
            {editing ? 'Guardar cambios' : 'Agregar tramo'}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
              }}
            >
              Cancelar edición
            </Button>
          )}
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          )}
        </div>
      </form>

      <PaginatedDataTable
        data={pageData?.comisiones ?? []}
        columns={columns}
        pagination={pageData}
        isLoading={isLoading}
        emptyMessage="Sin tramos de comisión configurados."
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="comisiones"
        rowActions={(c) => (
          <div className="flex justify-end gap-2">
            <EditRowButton
              onClick={() => {
                setEditing(c);
                setForm({
                  tramoMoraMin: c.tramoMoraMin,
                  tramoMoraMax: c.tramoMoraMax,
                  porcentaje: c.porcentaje,
                  estado: c.estado,
                });
              }}
            />
            <DeleteRowButton
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate({ idcomision: c.idcomision })
              }
            />
          </div>
        )}
      />
    </div>
  );
}
