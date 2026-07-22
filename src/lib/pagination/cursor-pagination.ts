/**
 * Helpers de paginación cursor (opaco) para listados grandes (I057).
 * Compatible con offset existente: usar cursor cuando se provee.
 */

import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '@/lib/pagination/pagination';

export interface CursorPaginationParams {
  take: number;
  /** ID exclusivo inferior (después de este id, orden ASC). */
  afterId: number | null;
}

export interface CursorPageMeta {
  nextCursor: string | null;
  hasNextPage: boolean;
  pageSize: number;
}

/**
 * Codifica id entero como cursor opaco (base64url).
 */
export function encodeCursor(id: number): string {
  return Buffer.from(JSON.stringify({ id }), 'utf8').toString('base64url');
}

/**
 * Decodifica cursor; null si inválido.
 */
export function decodeCursor(cursor: string | null | undefined): number | null {
  if (!cursor || !cursor.trim()) {
    return null;
  }
  try {
    const raw = Buffer.from(cursor.trim(), 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'id' in parsed &&
      typeof (parsed as { id: unknown }).id === 'number' &&
      Number.isInteger((parsed as { id: number }).id) &&
      (parsed as { id: number }).id > 0
    ) {
      return (parsed as { id: number }).id;
    }
    return null;
  } catch {
    return null;
  }
}

export function resolveCursorPagination(
  cursor?: string | null,
  pageSize?: number | null,
  defaultPageSize: number = DEFAULT_PAGE_SIZE,
): CursorPaginationParams {
  const take = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, pageSize ?? defaultPageSize),
  );
  return {
    take,
    afterId: decodeCursor(cursor),
  };
}

/**
 * Construye meta a partir de filas tomadas con take+1.
 */
export function buildCursorPageMeta<T>(
  rowsPlusOne: T[],
  take: number,
  getId: (row: T) => number,
): { items: T[]; meta: CursorPageMeta } {
  const hasNextPage = rowsPlusOne.length > take;
  const items = hasNextPage ? rowsPlusOne.slice(0, take) : rowsPlusOne;
  const last = items[items.length - 1];
  const lastId = last != null ? getId(last) : null;

  return {
    items,
    meta: {
      nextCursor: hasNextPage && lastId != null ? encodeCursor(lastId) : null,
      hasNextPage,
      pageSize: take,
    },
  };
}
