import { builder } from "../builder";
import { decimalToString } from "@/lib/cobranza/decimal-utils";
import {
  buildPaginationMeta,
  resolvePagination,
} from "@/lib/pagination/pagination";

export { resolvePagination, buildPaginationMeta };

type ExposeDecimalParent = Record<string, unknown>;

/**
 * Expone un campo Decimal de Prisma como scalar GraphQL Decimal (string).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exposeDecimal(t: any, fieldName: string) {
  return t.field({
    type: "Decimal",
    nullable: true,
    resolve: (parent: ExposeDecimalParent) =>
      decimalToString(parent[fieldName] as Parameters<typeof decimalToString>[0]),
  });
}

export const PaginationInfo = builder.objectRef<{
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>("PaginationInfo").implement({
  fields: (t) => ({
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    pageSize: t.exposeInt("pageSize"),
    totalPages: t.exposeInt("totalPages"),
  }),
});
