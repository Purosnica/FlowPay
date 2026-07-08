'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { PaginatedDataTable } from '@/components/cobranza/paginated-data-table';
import { usePagination } from '@/hooks/use-pagination';
import { buildPaginationMeta } from '@/lib/pagination/pagination';

interface ClientPaginatedDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  itemLabel?: string;
  initialPageSize?: number;
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
}: ClientPaginatedDataTableProps<T>) {
  const {
    queryVars,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({ initialPageSize });

  const pagination = useMemo(
    () =>
      buildPaginationMeta(data.length, queryVars.page, queryVars.pageSize),
    [data.length, queryVars.page, queryVars.pageSize],
  );

  const pagedData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return data.slice(start, start + pagination.pageSize);
  }, [data, pagination.page, pagination.pageSize]);

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
    />
  );
}
