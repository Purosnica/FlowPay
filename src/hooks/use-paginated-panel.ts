'use client';

import type { PaginationMeta } from '@/lib/pagination/pagination';
import { useScopedPagination } from '@/hooks/use-scoped-pagination';

interface UsePaginatedPanelOptions {
  scopeKey: string | number;
  initialPageSize?: number;
}

export function usePaginatedPanel({
  scopeKey,
  initialPageSize = 10,
}: UsePaginatedPanelOptions) {
  const {
    queryVars,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
  } = useScopedPagination(scopeKey, { initialPageSize });

  return {
    queryVars,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
  };
}

export type PaginatedGraphQLResponse<T> = PaginationMeta & {
  [key: string]: T[] | number;
};

export function extractPageItems<T>(
  page: PaginatedGraphQLResponse<T> | undefined,
  itemsKey: string,
): T[] {
  if (!page) {
    return [];
  }
  const items = page[itemsKey];
  return Array.isArray(items) ? items : [];
}
