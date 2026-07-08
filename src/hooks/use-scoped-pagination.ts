'use client';

import { useEffect } from 'react';
import { usePagination, type UsePaginationOptions } from '@/hooks/use-pagination';

export function useScopedPagination(
  scopeKey: string | number,
  options?: UsePaginationOptions,
) {
  const pagination = usePagination(options);
  const { resetPage } = pagination;

  useEffect(() => {
    resetPage();
  }, [scopeKey, resetPage]);

  return pagination;
}
