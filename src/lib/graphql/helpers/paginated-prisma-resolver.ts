import {
  buildPageResponse,
  executePaginatedQuery,
} from '@/lib/pagination/prisma-pagination';
import type { PaginationMeta } from '@/lib/pagination/pagination';

interface ResolvePaginatedPrismaQueryOptions<T> {
  page?: number | null;
  pageSize?: number | null;
  defaultPageSize?: number;
  itemsFieldName: string;
  findMany: (skip: number, take: number) => Promise<T[]>;
  count: () => Promise<number>;
}

export async function resolvePaginatedPrismaQuery<T>(
  options: ResolvePaginatedPrismaQueryOptions<T>,
): Promise<PaginationMeta & Record<string, T[] | number>> {
  const result = await executePaginatedQuery({
    page: options.page,
    pageSize: options.pageSize,
    defaultPageSize: options.defaultPageSize,
    findMany: options.findMany,
    count: options.count,
  });

  return buildPageResponse(options.itemsFieldName, result);
}