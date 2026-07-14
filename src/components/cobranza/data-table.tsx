'use client';

import { memo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PAGE_SIZE_OPTIONS } from '@/lib/pagination/pagination';
import { cn } from '@/lib/utils';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualSorting?: boolean;
}

const ALIGN_CLASS = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

function DataTableInner<T>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No se encontraron registros',
  onRowClick,
  rowActions,
  sorting: sortingControlled,
  onSortingChange,
  manualSorting = false,
}: DataTableProps<T>) {
  const [sortingUncontrolled, setSortingUncontrolled] = useState<SortingState>(
    [],
  );
  const sorting = sortingControlled ?? sortingUncontrolled;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    manualSorting,
    onSortingChange: onSortingChange ?? setSortingUncontrolled,
    state: { sorting },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState message={emptyMessage} className="py-12" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b border-stroke bg-gray-2/50 dark:border-dark-3 dark:bg-dark-2/40"
            >
              {headerGroup.headers.map((header) => {
                const align = header.column.columnDef.meta?.align ?? 'left';
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className={cn(
                      'px-4 py-3 text-sm font-semibold text-dark dark:text-white',
                      ALIGN_CLASS[align],
                      canSort && 'select-none',
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        className={cn(
                          'inline-flex items-center gap-1 transition-colors hover:text-primary',
                          align === 'right' && 'justify-end',
                          align === 'center' && 'justify-center',
                          align !== 'left' && 'w-full',
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        <span className="text-xs text-gray-5" aria-hidden>
                          {sorted === 'asc'
                            ? '▲'
                            : sorted === 'desc'
                              ? '▼'
                              : '⇅'}
                        </span>
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </th>
                );
              })}
              {rowActions && (
                <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">
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
              className={cn(
                'border-b border-stroke transition-colors dark:border-dark-3',
                onRowClick
                  ? 'cursor-pointer hover:bg-gray-2 dark:hover:bg-dark-2'
                  : 'hover:bg-gray-2/40 dark:hover:bg-dark-2/50',
              )}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell) => {
                const align = cell.column.columnDef.meta?.align ?? 'left';
                return (
                  <td
                    key={cell.id}
                    className={cn(
                      'px-4 py-3 text-sm text-dark dark:text-white',
                      ALIGN_CLASS[align],
                    )}
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </td>
                );
              })}
              {rowActions && (
                <td
                  className="px-4 py-3 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  {rowActions(row.original)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const DataTable = memo(DataTableInner) as typeof DataTableInner;

export function TablePagination({
  page,
  pageSize,
  total,
  totalPages,
  isLoading,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'registros',
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}) {
  if (total === 0) {
    return null;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div className="text-sm text-gray-6 dark:text-dark-6">
        Mostrando {from} a {to} de {total} {itemLabel}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={page === 1 || isLoading}
          aria-label="Primera página"
        >
          ««
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1 || isLoading}
        >
          Anterior
        </Button>
        <span className="text-sm text-dark dark:text-white">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages || isLoading}
        >
          Siguiente
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages || isLoading}
          aria-label="Última página"
        >
          »»
        </Button>
        <select
          value={pageSize.toString()}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={isLoading}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          aria-label="Registros por página"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} por página
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
