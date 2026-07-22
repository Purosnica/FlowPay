/**
 * Feature flags por mandante (I012).
 * idmandante=0 → flag global.
 */

import { prisma } from '@/lib/prisma';

export const FEATURE_FLAG = {
  PWA_OFFLINE_GESTIONES: 'pwa_offline_gestiones',
  EVENT_BUS_WEBHOOKS: 'event_bus_webhooks',
} as const;

export type FeatureFlagClave =
  (typeof FEATURE_FLAG)[keyof typeof FEATURE_FLAG];

const CACHE_TTL_MS = 15_000;

type CacheEntry = { value: boolean; expiresAt: number };

const cache = new Map<string, CacheEntry>();

function cacheKey(clave: string, idmandante: number): string {
  return `${clave}:${idmandante}`;
}

export function clearFeatureFlagCacheForTests(): void {
  cache.clear();
}

/**
 * Prioridad: flag del mandante > flag global (idmandante=0) > defaultValue.
 */
export async function isFeatureEnabled(
  clave: string,
  idmandante?: number | null,
  defaultValue = false,
): Promise<boolean> {
  const mandanteId = idmandante && idmandante > 0 ? idmandante : 0;
  const key = cacheKey(clave, mandanteId);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value;
  }

  const rows = await prisma.tbl_feature_flag.findMany({
    where: {
      clave,
      idmandante: mandanteId > 0 ? { in: [0, mandanteId] } : 0,
    },
    select: { idmandante: true, activo: true },
  });

  const porMandante = rows.find((r) => r.idmandante === mandanteId);
  const global = rows.find((r) => r.idmandante === 0);
  const value = porMandante?.activo ?? global?.activo ?? defaultValue;

  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function setFeatureFlag(params: {
  clave: string;
  idmandante?: number;
  activo: boolean;
}): Promise<void> {
  const idmandante = params.idmandante ?? 0;
  await prisma.tbl_feature_flag.upsert({
    where: {
      clave_idmandante: {
        clave: params.clave,
        idmandante,
      },
    },
    create: {
      clave: params.clave,
      idmandante,
      activo: params.activo,
    },
    update: { activo: params.activo },
  });
  cache.delete(cacheKey(params.clave, idmandante));
  if (idmandante === 0) {
    for (const k of cache.keys()) {
      if (k.startsWith(`${params.clave}:`)) {
        cache.delete(k);
      }
    }
  }
}
