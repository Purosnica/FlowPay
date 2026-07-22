/**
 * Lógica pura de cache ETag para catálogos (I116) — usable en tests.
 */

export type CatalogoEtagCache<T> = {
  etag: string;
  data: T;
};

export function aplicarRespuestaCatalogoEtag<T>(params: {
  status: number;
  etag: string | null;
  body: T | null;
  previous: CatalogoEtagCache<T> | null;
}): CatalogoEtagCache<T> | null {
  if (params.status === 304 && params.previous) {
    return params.previous;
  }
  if (params.status === 200 && params.body != null && params.etag) {
    return { etag: params.etag, data: params.body };
  }
  return null;
}
