"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { useState, useRef } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface VirtualizedTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  isLoading?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  height?: number;
  rowHeight?: number;
  onRowClick?: (row: TData) => void;
  className?: string;
  emptyMessage?: string;
}

export function VirtualizedTable<TData>({
  data,
  columns,
  isLoading = false,
  enableSorting = true,
  enableFiltering = true,
  height = 600,
  rowHeight = 50,
  onRowClick,
  className,
  emptyMessage = "No se encontraron resultados",
}: VirtualizedTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
  });

  const { rows } = table.getRowModel();
  const parentRef = useRef<HTMLDivElement>(null);

  // Renderizado virtual simple (sin @tanstack/react-virtual por ahora)
  // Se puede agregar luego si se necesita para 5000+ filas

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {enableFiltering && (
        <Input
          placeholder="Buscar en todos los campos..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-stroke dark:border-dark-3">
        <div className="overflow-hidden">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-2 dark:bg-dark-2">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border-b border-stroke px-4 py-3 text-left text-sm font-semibold text-dark dark:border-dark-3 dark:text-white"
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
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
          </table>

          <div
            ref={parentRef}
            className="overflow-auto"
            style={{ maxHeight: `${height}px` }}
          >
            {rows.length === 0 ? (
              <div className="flex h-full items-center justify-center py-12">
                <p className="text-gray-500">{emptyMessage}</p>
              </div>
            ) : (
              <div ref={parentRef} style={{ maxHeight: `${height}px`, overflowY: "auto" }}>
                <table className="w-full">
                  <tbody>
                    {rows.map((row) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-300">
        Mostrando {rows.length} resultados
      </div>
    </div>
  );
}

