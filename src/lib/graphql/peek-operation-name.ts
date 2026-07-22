/**
 * Extrae operationName del body GraphQL JSON sin consumir el stream original.
 * Clona el request para rate-limit por operación (I055).
 */

import type { NextRequest } from 'next/server';
import { extractOperationNameFromQuery } from '@/lib/graphql/plugins/persisted-queries';

export async function peekGraphqlOperationName(
  request: NextRequest,
): Promise<string | undefined> {
  if (request.method !== 'POST') {
    return undefined;
  }
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return undefined;
  }

  try {
    const cloned = request.clone();
    const body: unknown = await cloned.json();
    if (!body || typeof body !== 'object') {
      return undefined;
    }
    const record = body as {
      operationName?: unknown;
      query?: unknown;
    };
    if (
      typeof record.operationName === 'string' &&
      record.operationName.trim()
    ) {
      return record.operationName.trim();
    }
    if (typeof record.query === 'string') {
      return extractOperationNameFromQuery(record.query);
    }
    return undefined;
  } catch {
    return undefined;
  }
}
