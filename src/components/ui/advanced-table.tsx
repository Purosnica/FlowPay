"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useState, useMemo } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Select } from "./select";
import { cn } from "@/lib/utils";

interface AdvancedTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  isLoading?: boolean;
  enablePagination?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableColumnVisibility?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (row: TData) => void;
  className?: string;
  emptyMessage?: string;
}

export function AdvancedTable<TData>({
  data,
  columns,
  isLoading = false,
  enablePagination = true,
  enableSorting = true,
  enableFiltering = true,
  enableColumnVisibility = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onRowClick,
  className,
  emptyMessage = "No se encontraron resultados",
}: AdvancedTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageSize, setPageSize] = useState(initialPageSize);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const visibleColumns = table.getVisibleFlatColumns();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filtros y controles */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {enableFiltering && (
          <div className="flex-1">
            <Input
              placeholder="Buscar en todos los campos..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
        )}

        {enablePagination && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Mostrar:
            </span>
            <Select
              options={pageSizeOptions.map((size) => ({
                value: size.toString(),
                label: size.toString(),
              }))}
              value={pageSize.toString()}
              onChange={(e) => {
                const newSize = parseInt(e.target.value);
                setPageSize(newSize);
                table.setPageSize(newSize);
              }}
              className="w-20"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              de {table.getFilteredRowModel().rows.length} resultados
            </span>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-stroke dark:border-dark-3">
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
                    style={{
                      width: header.getSize() !== 150 ? header.getSize() : undefined,
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          "flex items-center gap-2",
                          enableSorting && header.column.getCanSort()
                            ? "cursor-pointer select-none hover:text-primary"
                            : ""
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {enableSorting && header.column.getCanSort() && (
                          <span className="text-xs">
                            {{
                              asc: " ↑",
                              desc: " ↓",
                            }[header.column.getIsSorted() as string] ?? " ↕"}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-stroke transition-colors hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 text-sm text-dark dark:text-gray-300"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {enablePagination && table.getPageCount() > 1 && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Mostrando{" "}
            {table.getState().pagination.pageIndex * pageSize + 1} a{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            de {table.getFilteredRowModel().rows.length} resultados
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              ««
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              «
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Página {table.getState().pagination.pageIndex + 1} de{" "}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              »
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              »»
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}



