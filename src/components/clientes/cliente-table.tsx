"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Cliente } from "@/types/cliente";

interface ClienteTableProps {
  data: Cliente[];
  columns: ColumnDef<Cliente>[];
  onEdit?: (cliente: Cliente) => void;
  onDelete?: (id: number) => void;
  isLoading?: boolean;
}

export function ClienteTable({
  data,
  columns,
  onEdit,
  onDelete,
  isLoading = false,
}: ClienteTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-gray-6 dark:text-dark-6">
        No se encontraron clientes
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b border-stroke bg-gray-2 dark:border-dark-3 dark:bg-dark-2"
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-sm font-semibold text-dark dark:text-white"
                >
                  {header.isPlaceholder ? null : (
                    <div
                      className={
                        header.column.getCanSort()
                          ? "cursor-pointer select-none hover:text-primary"
                          : ""
                      }
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: " ↑",
                        desc: " ↓",
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  )}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-dark dark:text-white">
                  Acciones
                </th>
              )}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-stroke hover:bg-gray-2 dark:border-dark-3 dark:hover:bg-dark-2"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-4 py-3 text-sm text-dark dark:text-dark-6"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(row.original)}
                      >
                        Editar
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(row.original.idcliente)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}










