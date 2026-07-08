import {
  buildPaginationMeta,
  resolvePagination,
  type PaginationMeta,
} from '@/lib/pagination/pagination';

export interface PaginatedQueryResult<T> extends PaginationMeta {
  data: T[];
}

export interface ExecutePaginatedQueryOptions<T> {
  page?: number | null;
  pageSize?: number | null;
  defaultPageSize?: number;
  findMany: (skip: number, take: number) => Promise<T[]>;
  count: () => Promise<number>;
}

export async function executePaginatedQuery<T>(
  options: ExecutePaginatedQueryOptions<T>,
): Promise<PaginatedQueryResult<T>> {
  const { page, pageSize, skip } = resolvePagination(
    options.page,
    options.pageSize,
    options.defaultPageSize,
  );

  const [data, total] = await Promise.all([
    options.findMany(skip, pageSize),
    options.count(),
  ]);

  return {
    data,
    ...buildPaginationMeta(total, page, pageSize),
  };
}

export function buildPageResponse<T>(
  itemsFieldName: string,
  result: PaginatedQueryResult<T>,
): PaginationMeta & Record<string, T[] | number> {
  return {
    [itemsFieldName]: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  };
}