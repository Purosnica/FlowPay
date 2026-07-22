/**
 * Caché en memoria con TTL (proceso local / instancia warm).
 */

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function memoryCacheGet(key: string): string | null {
  const entry = store.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function memoryCacheSet(
  key: string,
  value: string,
  ttlSeconds: number,
): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
  });
}

export function memoryCacheDelete(key: string): void {
  store.delete(key);
}

/** Limpieza oportunista de entradas expiradas (tests / mantenimiento). */
export function memoryCachePurgeExpired(): number {
  const now = Date.now();
  let purged = 0;
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) {
      store.delete(key);
      purged++;
    }
  }
  return purged;
}
