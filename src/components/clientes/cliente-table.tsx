'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/cobranza/data-table';
import {
  DeleteRowButton,
  EditRowButton,
} from '@/components/ui/row-action-buttons';
import type { Cliente } from '@/types/cliente';

interface ClienteTableProps {
  data: Cliente[];
  columns: ColumnDef<Cliente>[];
  onEdit?: (cliente: Cliente) => void;
  onDelete?: (id: number) => void;
  isLoading?: boolean;
}

/** I110: reutiliza DataTable (virtualización TanStack). */
export function ClienteTable({
  data,
  columns,
  onEdit,
  onDelete,
  isLoading = false,
}: ClienteTableProps) {
  const rowActions =
    onEdit || onDelete
      ? (row: Cliente) => (
          <div className="flex gap-2">
            {onEdit ? (
              <EditRowButton onClick={() => onEdit(row)} />
            ) : null}
            {onDelete ? (
              <DeleteRowButton onClick={() => onDelete(row.idcliente)} />
            ) : null}
          </div>
        )
      : undefined;

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      emptyMessage="No se encontraron clientes"
      rowActions={rowActions}
    />
  );
}
