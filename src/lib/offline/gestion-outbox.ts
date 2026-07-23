/**
 * Cola local de gestiones offline (I036).
 * Persistencia: localStorage cifrado AES-GCM + TTL 72h (SEC-01).
 */

import { crearIdempotencyKey } from '@/lib/api/idempotency-key';
import {
  escribirColaOutboxCifrada,
  leerColaOutboxCifrada,
} from '@/lib/offline/outbox-storage';

const STORAGE_KEY = 'flowpay.gestion-outbox.v2';
const LEGACY_KEY = 'flowpay.gestion-outbox.v1';

export type GestionOutboxPayload = {
  idprestamo: number;
  idcodaccion?: number;
  idcodresultado?: number;
  telefonoContacto?: string;
  contactoTercero?: boolean;
  nota: string;
  montoPromesa?: number;
  fechaPromesa?: string;
  fechaProximaGestion?: string;
  comentario?: string;
  idempotencyKey: string;
};

export type GestionOutboxItem = {
  id: string;
  createdAt: string;
  payload: GestionOutboxPayload;
  lastError?: string;
};

let cache: GestionOutboxItem[] | null = null;
let hydratePromise: Promise<void> | null = null;

function parseItem(raw: unknown): GestionOutboxItem | null {
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
  return o as unknown as GestionOutboxItem;
}

function emitirCambio(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent('flowpay:gestion-outbox'));
}

async function persistir(items: GestionOutboxItem[]): Promise<void> {
  cache = items;
  await escribirColaOutboxCifrada(STORAGE_KEY, items);
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(LEGACY_KEY);
  }
  emitirCambio();
}

export async function hidratarGestionOutbox(): Promise<void> {
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

function colaSync(): GestionOutboxItem[] {
  return cache ?? [];
}

export function estaOffline(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return !navigator.onLine;
}

export function listarGestionOutbox(): GestionOutboxItem[] {
  return colaSync();
}

export function contarGestionOutbox(): number {
  return colaSync().length;
}

export async function encolarGestionOutbox(
  input: Omit<GestionOutboxPayload, 'idempotencyKey'> & {
    idempotencyKey?: string;
  },
): Promise<GestionOutboxItem> {
  await hidratarGestionOutbox();
  const item: GestionOutboxItem = {
    id: crearIdempotencyKey('out'),
    createdAt: new Date().toISOString(),
    payload: {
      ...input,
      idempotencyKey: input.idempotencyKey ?? crearIdempotencyKey('ges'),
    },
  };
  await persistir([...colaSync(), item]);
  return item;
}

export async function removerGestionOutbox(id: string): Promise<void> {
  await hidratarGestionOutbox();
  await persistir(colaSync().filter((x) => x.id !== id));
}

export async function marcarErrorGestionOutbox(
  id: string,
  error: string,
): Promise<void> {
  await hidratarGestionOutbox();
  await persistir(
    colaSync().map((x) => (x.id === id ? { ...x, lastError: error } : x)),
  );
}

export async function purgarGestionOutbox(): Promise<void> {
  cache = [];
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
  }
  emitirCambio();
}
