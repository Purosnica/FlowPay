/**
 * Persistencia cifrada + TTL para outbox offline (SEC-01).
 */

import {
  cifrarTextoOutbox,
  descifrarTextoOutbox,
  esEnvelopeV2,
} from '@/lib/offline/outbox-crypto';

/** 72h: pagos/gestiones pendientes no viven indefinidos en el dispositivo. */
export const OUTBOX_TTL_MS = 72 * 60 * 60 * 1000;

export type OutboxItemBase = {
  id: string;
  createdAt: string;
};

export function filtrarOutboxPorTtl<T extends OutboxItemBase>(
  items: T[],
  nowMs: number = Date.now(),
): T[] {
  return items.filter((item) => {
    const created = Date.parse(item.createdAt);
    if (Number.isNaN(created)) {
      return false;
    }
    return nowMs - created <= OUTBOX_TTL_MS;
  });
}

function esArrayItems(value: unknown): value is OutboxItemBase[] {
  return Array.isArray(value);
}

/**
 * Lee cola: soporta legado plaintext (v1) y envelope AES-GCM (v2).
 * Re-escribe cifrado si migró desde v1 o purgó por TTL.
 */
export async function leerColaOutboxCifrada<T extends OutboxItemBase>(
  storageKey: string,
  parseItem: (raw: unknown) => T | null,
): Promise<T[]> {
  if (typeof window === 'undefined') {
    return [];
  }
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return [];
  }

  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }

  let itemsRaw: unknown[] = [];
  let migrated = false;

  if (esEnvelopeV2(parsedUnknown)) {
    const plain = await descifrarTextoOutbox(raw);
    if (!plain) {
      return [];
    }
    try {
      const inner: unknown = JSON.parse(plain);
      if (!Array.isArray(inner)) {
        return [];
      }
      itemsRaw = inner;
    } catch {
      return [];
    }
  } else if (esArrayItems(parsedUnknown)) {
    itemsRaw = parsedUnknown;
    migrated = true;
  } else {
    window.localStorage.removeItem(storageKey);
    return [];
  }

  const parsed: T[] = [];
  for (const entry of itemsRaw) {
    const item = parseItem(entry);
    if (item) {
      parsed.push(item);
    }
  }

  const vivos = filtrarOutboxPorTtl(parsed);
  if (migrated || vivos.length !== parsed.length) {
    await escribirColaOutboxCifrada(storageKey, vivos);
  }
  return vivos;
}

export async function escribirColaOutboxCifrada<T extends OutboxItemBase>(
  storageKey: string,
  items: T[],
): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  const vivos = filtrarOutboxPorTtl(items);
  const cipher = await cifrarTextoOutbox(JSON.stringify(vivos));
  window.localStorage.setItem(storageKey, cipher);
}
