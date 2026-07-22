/**
 * Compresión gzip de respuestas GraphQL grandes (reportes / payloads pesados).
 */

import { gzipSync } from 'node:zlib';

/** Umbral a partir del cual se comprime (bytes). */
export const GRAPHQL_COMPRESS_THRESHOLD_BYTES = 8_192;

export function aceptarGzip(request: Request): boolean {
  const accept = request.headers.get('accept-encoding') ?? '';
  return /\bgzip\b/i.test(accept);
}

/**
 * Si el cliente acepta gzip y el body supera el umbral, reescribe la Response.
 */
export async function quizásComprimirGraphqlResponse(
  request: Request,
  response: Response,
): Promise<Response> {
  if (response.status !== 200 || !aceptarGzip(request)) {
    return response;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return response;
  }

  if (response.headers.get('content-encoding')) {
    return response;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength < GRAPHQL_COMPRESS_THRESHOLD_BYTES) {
    return new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  const compressed = gzipSync(buffer);
  const headers = new Headers(response.headers);
  headers.set('Content-Encoding', 'gzip');
  headers.set('Content-Length', String(compressed.byteLength));
  headers.set('Vary', mergeVary(headers.get('Vary'), 'Accept-Encoding'));

  return new Response(compressed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function mergeVary(existing: string | null, value: string): string {
  if (!existing) {
    return value;
  }
  const parts = existing.split(',').map((p) => p.trim().toLowerCase());
  if (parts.includes(value.toLowerCase())) {
    return existing;
  }
  return `${existing}, ${value}`;
}
