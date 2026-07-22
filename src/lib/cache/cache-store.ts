/**
 * Caché unificado: Redis (Upstash) si está configurado + memoria local.
 */

import {
  memoryCacheDelete,
  memoryCacheGet,
  memoryCacheSet,
} from './ttl-memory-cache';
import {
  redisCacheDelete,
  redisCacheDisponible,
  redisCacheGet,
  redisCacheSet,
} from './redis-cache';

export async function cacheGet(key: string): Promise<string | null> {
  const local = memoryCacheGet(key);
  if (local !== null) {
    return local;
  }
  if (!redisCacheDisponible()) {
    return null;
  }
  const remote = await redisCacheGet(key);
  if (remote !== null) {
    // Rehidrata memoria local con TTL corto para hits intra-instancia.
    memoryCacheSet(key, remote, 15);
  }
  return remote;
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  memoryCacheSet(key, value, ttlSeconds);
  if (redisCacheDisponible()) {
    await redisCacheSet(key, value, ttlSeconds);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  memoryCacheDelete(key);
  if (redisCacheDisponible()) {
    await redisCacheDelete(key);
  }
}

export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet(key);
  if (cached !== null) {
    return JSON.parse(cached) as T;
  }
  const value = await factory();
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
  return value;
}
