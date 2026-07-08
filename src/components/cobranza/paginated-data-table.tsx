'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, TablePagination } from '@/components/cobranza/data-table';
import type { PaginationMeta } from '@/lib/pagination/pagination';

interface PaginatedDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pagination?: PaginationMeta | null;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

export function PaginatedDataTable<T>({
  data,
  columns,
  pagination,
  isLoading = false,
  emptyMessage,
  onRowClick,
  rowActions,
  onPageChange,
  onPageSizeChange,
  itemLabel,
}: PaginatedDataTableProps<T>) {
  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        onRowClick={onRowClick}
        rowActions={rowActions}
      />
      {pagination && pagination.total > 0 && (
        <TablePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          isLoading={isLoading}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel={itemLabel}
        />
      )}
    </>
  );
}
