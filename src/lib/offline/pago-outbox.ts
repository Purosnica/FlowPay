/**
 * Cola local de pagos offline (paridad con gestiones I036).
 * Persistencia: localStorage cifrado AES-GCM + TTL 72h (SEC-01).
 */

import { crearIdempotencyKey } from '@/lib/api/idempotency-key';
import {
  escribirColaOutboxCifrada,
  leerColaOutboxCifrada,
} from '@/lib/offline/outbox-storage';

const STORAGE_KEY = 'flowpay.pago-outbox.v2';
const LEGACY_KEY = 'flowpay.pago-outbox.v1';

export type PagoOutboxPayload = {
  idprestamo: number;
  monto: number;
  fechaPago: string;
  moneda: 'NIO' | 'USD';
  medio?: string;
  idempotencyKey: string;
};

export type PagoOutboxItem = {
  id: string;
  createdAt: string;
  payload: PagoOutboxPayload;
  lastError?: string;
};

let cache: PagoOutboxItem[] | null = null;
let hydratePromise: Promise<void> | null = null;

function parseItem(raw: unknown): PagoOutboxItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.createdAt !== 'string') {
    return null;
  }
  if (!o.payload || typeof o.payload !== 'object') {
    return null;
  }
  return o as unknown as PagoOutboxItem;
}

function emitirCambio(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent('flowpay:pago-outbox'));
}

async function persistir(items: PagoOutboxItem[]): Promise<void> {
  cache = items;
  await escribirColaOutboxCifrada(STORAGE_KEY, items);
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(LEGACY_KEY);
  }
  emitirCambio();
}

export async function hidratarPagoOutbox(): Promise<void> {
  if (cache !== null) {
    return;
  }
  if (!hydratePromise) {
    hydratePromise = (async () => {
      let items = await leerColaOutboxCifrada(STORAGE_KEY, parseItem);
      if (items.length === 0 && typeof window !== 'undefined') {
        const legacy = window.localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          items = await leerColaOutboxCifrada(LEGACY_KEY, parseItem);
          if (items.length > 0) {
            await escribirColaOutboxCifrada(STORAGE_KEY, items);
          }
          window.localStorage.removeItem(LEGACY_KEY);
        }
      }
      cache = items;
    })().finally(() => {
      hydratePromise = null;
    });
  }
  await hydratePromise;
}

function colaSync(): PagoOutboxItem[] {
  return cache ?? [];
}

export function listarPagoOutbox(): PagoOutboxItem[] {
  return colaSync();
}

export function contarPagoOutbox(): number {
  return colaSync().length;
}

export async function encolarPagoOutbox(
  input: Omit<PagoOutboxPayload, 'idempotencyKey'> & {
    idempotencyKey?: string;
  },
): Promise<PagoOutboxItem> {
  await hidratarPagoOutbox();
  const item: PagoOutboxItem = {
    id: crearIdempotencyKey('pout'),
    createdAt: new Date().toISOString(),
    payload: {
      ...input,
      idempotencyKey: input.idempotencyKey ?? crearIdempotencyKey('pago'),
    },
  };
  const cola = [...colaSync(), item];
  await persistir(cola);
  return item;
}

export async function removerPagoOutbox(id: string): Promise<void> {
  await hidratarPagoOutbox();
  await persistir(colaSync().filter((x) => x.id !== id));
}

export async function marcarErrorPagoOutbox(
  id: string,
  error: string,
): Promise<void> {
  await hidratarPagoOutbox();
  await persistir(
    colaSync().map((x) => (x.id === id ? { ...x, lastError: error } : x)),
  );
}

export async function purgarPagoOutbox(): Promise<void> {
  cache = [];
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
  }
  emitirCambio();
}
