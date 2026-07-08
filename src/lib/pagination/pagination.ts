export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function resolvePagination(
  page?: number | null,
  pageSize?: number | null,
  defaultPageSize: number = DEFAULT_PAGE_SIZE,
): PaginationParams {
  const resolvedPage = Math.max(DEFAULT_PAGE, page ?? DEFAULT_PAGE);
  const resolvedPageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, pageSize ?? defaultPageSize),
  );

  return {
    page: resolvedPage,
    pageSize: resolvedPageSize,
    skip: (resolvedPage - 1) * resolvedPageSize,
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number,
): PaginationMeta {
  return {
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
