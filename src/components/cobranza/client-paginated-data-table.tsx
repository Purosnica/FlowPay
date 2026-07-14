'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { usePagination } from '@/hooks/use-pagination';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  buildPaginationMeta,
} from '@/lib/pagination/pagination';

interface ClientPaginatedDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  itemLabel?: string;
  initialPageSize?: number;
  /** Cambia cuando los filtros/contenido deben volver a página 1. */
  resetKey?: string | number;
}

function resolvePageSize(size: number | undefined): number {
  if (size == null) {
    return DEFAULT_PAGE_SIZE;
  }
  if ((PAGE_SIZE_OPTIONS as readonly number[]).includes(size)) {
    return size;
  }
  return DEFAULT_PAGE_SIZE;
}

export function ClientPaginatedDataTable<T>({
  data,
  columns,
  isLoading = false,
  emptyMessage,
  onRowClick,
  rowActions,
  itemLabel,
  initialPageSize,
  resetKey,
}: ClientPaginatedDataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const {
    queryVars,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
    setPage,
  } = usePagination({ initialPageSize: resolvePageSize(initialPageSize) });

  useEffect(() => {
    resetPage();
  }, [data.length, resetKey, resetPage]);

  const sortingTable = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const sortedRows = sortingTable.getSortedRowModel().rows;
  const total = sortedRows.length;

  const pagination = useMemo(() => {
    const meta = buildPaginationMeta(
      total,
      queryVars.page,
      queryVars.pageSize,
    );
    if (meta.totalPages > 0 && queryVars.page > meta.totalPages) {
      return {
        ...meta,
        page: meta.totalPages,
      };
    }
    if (meta.totalPages === 0) {
      return { ...meta, page: DEFAULT_PAGE };
    }
    return meta;
  }, [total, queryVars.page, queryVars.pageSize]);

  useEffect(() => {
    if (pagination.page !== queryVars.page) {
      setPage(pagination.page);
    }
  }, [pagination.page, queryVars.page, setPage]);

  const pagedData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return sortedRows
      .slice(start, start + pagination.pageSize)
      .map((row) => row.original);
  }, [sortedRows, pagination.page, pagination.pageSize]);

  return (
    <PaginatedDataTable
      data={pagedData}
      columns={columns}
      pagination={pagination}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      onRowClick={onRowClick}
      rowActions={rowActions}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      itemLabel={itemLabel}
      sorting={sorting}
      onSortingChange={setSorting}
      manualSorting
    />
  );
}
