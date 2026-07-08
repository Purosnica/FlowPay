'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  type PaginationMeta,
} from '@/lib/pagination/pagination';

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export type { UsePaginationOptions };

export function usePagination(options: UsePaginationOptions = {}) {
  const [page, setPage] = useState(options.initialPage ?? DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(
    options.initialPageSize ?? DEFAULT_PAGE_SIZE,
  );

  const resetPage = useCallback(() => {
    setPage(DEFAULT_PAGE);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(DEFAULT_PAGE);
  }, []);

  const queryVars = useMemo(() => ({ page, pageSize }), [page, pageSize]);

  const getPaginationProps = useCallback(
    (meta: PaginationMeta | undefined, isLoading?: boolean) => {
      if (!meta || meta.total === 0) {
        return null;
      }

      return {
        page: meta.page,
        pageSize: meta.pageSize,
        total: meta.total,
        totalPages: meta.totalPages,
        isLoading,
        onPageChange: handlePageChange,
        onPageSizeChange: handlePageSizeChange,
      };
    },
    [handlePageChange, handlePageSizeChange],
  );

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPage,
    handlePageChange,
    handlePageSizeChange,
    queryVars,
    getPaginationProps,
  };
}
