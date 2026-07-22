'use client';

/**
 * I116: catálogo tipificaciones global vía REST + ETag / 304.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import {
  aplicarRespuestaCatalogoEtag,
  type CatalogoEtagCache,
} from '@/lib/http/catalog-etag-client';
import type { CodigoAccion, CodigoResultado } from '@/types/cobranza';

export type CatalogoTipificacionesData = {
  acciones: CodigoAccion[];
  resultados: CodigoResultado[];
};

let memoryCache: CatalogoEtagCache<CatalogoTipificacionesData> | null = null;

async function fetchCatalogoTipificaciones(): Promise<CatalogoTipificacionesData> {
  const headers: HeadersInit = {
    Accept: 'application/json',
  };
  if (memoryCache?.etag) {
    headers['If-None-Match'] = memoryCache.etag;
  }

  const res = await fetch('/api/catalogos/tipificaciones', {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  const etag = res.headers.get('ETag');
  let body: CatalogoTipificacionesData | null = null;

  if (res.status === 200) {
    const json = (await res.json()) as {
      success?: boolean;
      data?: CatalogoTipificacionesData;
    };
    if (!json.data) {
      throw new Error('Catálogo tipificaciones inválido.');
    }
    body = json.data;
  } else if (res.status !== 304) {
    throw new Error(`Catálogo tipificaciones HTTP ${res.status}`);
  }

  const next = aplicarRespuestaCatalogoEtag({
    status: res.status,
    etag,
    body,
    previous: memoryCache,
  });
  if (!next) {
    throw new Error('No se pudo resolver catálogo tipificaciones.');
  }
  memoryCache = next;
  return next.data;
}

export function useCatalogosTipificaciones(enabled: boolean) {
  const { usuario, loading: authLoading } = useAuth();
  const isAuthenticated = !authLoading && !!usuario;

  return useQuery({
    queryKey: ['catalogos', 'tipificaciones'],
    queryFn: fetchCatalogoTipificaciones,
    enabled: enabled && isAuthenticated,
    staleTime: 60_000,
  });
}
