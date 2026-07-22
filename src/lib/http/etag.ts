/**
 * Helpers HTTP cache / ETag para catálogos.
 */

import { createHash } from 'node:crypto';

export function etagFromPayload(payload: string): string {
  const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
  return `"${hash}"`;
}

export function clienteTieneEtagFresco(
  request: Request,
  etag: string,
): boolean {
  const inm = request.headers.get('if-none-match');
  if (!inm) {
    return false;
  }
  return inm
    .split(',')
    .map((v) => v.trim())
    .includes(etag);
}

export function headersCacheCatalogo(etag: string, maxAgeSeconds = 60): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('ETag', etag);
  headers.set(
    'Cache-Control',
    `private, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`,
  );
  headers.set('Vary', 'Authorization, Cookie');
  return headers;
}
