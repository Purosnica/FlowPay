/**
 * Cliente Redis opcional vía Upstash REST (sin dependencia extra).
 * Activo solo si UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN están definidos.
 */

function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    return null;
  }
  return { url: url.replace(/\/$/, ''), token };
}

export function redisCacheDisponible(): boolean {
  return upstashConfig() !== null;
}

async function upstashCommand(
  command: (string | number)[],
): Promise<unknown> {
  const cfg = upstashConfig();
  if (!cfg) {
    return null;
  }

  const res = await fetch(`${cfg.url}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  const body = (await res.json()) as { result?: unknown };
  return body.result ?? null;
}

export async function redisCacheGet(key: string): Promise<string | null> {
  try {
    const result = await upstashCommand(['GET', key]);
    return typeof result === 'string' ? result : null;
  } catch {
    return null;
  }
}

export async function redisCacheSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  try {
    await upstashCommand(['SET', key, value, 'EX', Math.max(1, ttlSeconds)]);
  } catch {
    // Fallback silencioso: la capa superior usa memoria.
  }
}

export async function redisCacheDelete(key: string): Promise<void> {
  try {
    await upstashCommand(['DEL', key]);
  } catch {
    // ignore
  }
}
