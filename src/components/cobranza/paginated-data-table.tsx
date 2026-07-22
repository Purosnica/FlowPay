'use client';

import type {
  ColumnDef,
  OnChangeFn,
  SortingState,
} from '@tanstack/react-table';
import { DataTable, TablePagination } from '@/components/cobranza/data-table';
import type { PaginationMeta } from '@/lib/pagination/pagination';

interface PaginatedDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pagination?: PaginationMeta | null;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T, index: number) => string | undefined;
  getRowAttrs?: (
    row: T,
    index: number,
  ) => Record<string, string | boolean | number | undefined>;
  rowActions?: (row: T) => React.ReactNode;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualSorting?: boolean;
}

export function PaginatedDataTable<T>({
  data,
  columns,
  pagination,
  isLoading = false,
  emptyMessage,
  emptyAction,
  onRowClick,
  getRowClassName,
  getRowAttrs,
  rowActions,
  onPageChange,
  onPageSizeChange,
  itemLabel,
  sorting,
  onSortingChange,
  manualSorting = false,
}: PaginatedDataTableProps<T>) {
  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        emptyAction={emptyAction}
        onRowClick={onRowClick}
        getRowClassName={getRowClassName}
        getRowAttrs={getRowAttrs}
        rowActions={rowActions}
        sorting={sorting}
        onSortingChange={onSortingChange}
        manualSorting={manualSorting}
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
