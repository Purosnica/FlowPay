import { builder } from '../builder';
import type { PaginationMeta } from '@/lib/pagination/pagination';

type PageParent = PaginationMeta & Record<string, number | never[]>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPageType(name: string, itemType: any, itemsFieldName: string) {
  return builder.objectRef<PageParent>(name).implement({
    fields: (t) => ({
      [itemsFieldName]: t.field({
        type: [itemType],
        resolve: (parent) => parent[itemsFieldName] as never,
      }),
      total: t.int({ resolve: (parent) => parent.total }),
      page: t.int({ resolve: (parent) => parent.page }),
      pageSize: t.int({ resolve: (parent) => parent.pageSize }),
      totalPages: t.int({ resolve: (parent) => parent.totalPages }),
    }),
  });
}