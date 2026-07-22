/**
 * Caché de KPIs / resumen dashboard (TTL 30–60s).
 */

import type { Prisma } from '@prisma/client';
import { cacheGetOrSet } from './cache-store';

/** TTL por defecto: 45s (mitad del rango 30–60). */
export const KPI_CACHE_TTL_SECONDS = 45;

type MandanteScope = number | Prisma.IntFilter | undefined;

function mandanteKeyPart(idmandante: MandanteScope): string {
  if (idmandante == null) {
    return 'all';
  }
  if (typeof idmandante === 'number') {
    return String(idmandante);
  }
  if (Array.isArray(idmandante.in)) {
    return [...idmandante.in].sort((a, b) => a - b).join(',');
  }
  return JSON.stringify(idmandante);
}

export function claveCacheResumenDashboard(
  idusuario: number,
  idmandante: MandanteScope,
): string {
  return `kpi:dashboard:${idusuario}:${mandanteKeyPart(idmandante)}`;
}

export function claveCacheKpisCore(
  idusuario: number,
  idmandante: MandanteScope,
): string {
  return `kpi:core:${idusuario}:${mandanteKeyPart(idmandante)}`;
}

export async function conCacheKpi<T>(
  key: string,
  factory: () => Promise<T>,
  ttlSeconds = KPI_CACHE_TTL_SECONDS,
): Promise<T> {
  return cacheGetOrSet(key, ttlSeconds, factory);
}
