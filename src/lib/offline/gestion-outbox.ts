/**
 * Cola local de gestiones offline (I036).
 * Persistencia: localStorage (sin inventar IndexedDB).
 */

import { crearIdempotencyKey } from '@/lib/api/idempotency-key';

const STORAGE_KEY = 'flowpay.gestion-outbox.v1';

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

function leerCola(): GestionOutboxItem[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as GestionOutboxItem[];
  } catch {
    return [];
  }
}

function escribirCola(items: GestionOutboxItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('flowpay:gestion-outbox'));
}

export function estaOffline(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return !navigator.onLine;
}

export function listarGestionOutbox(): GestionOutboxItem[] {
  return leerCola();
}

export function contarGestionOutbox(): number {
  return leerCola().length;
}

export function encolarGestionOutbox(
  input: Omit<GestionOutboxPayload, 'idempotencyKey'> & {
    idempotencyKey?: string;
  },
): GestionOutboxItem {
  const item: GestionOutboxItem = {
    id: crearIdempotencyKey('out'),
    createdAt: new Date().toISOString(),
    payload: {
      ...input,
      idempotencyKey: input.idempotencyKey ?? crearIdempotencyKey('ges'),
    },
  };
  const cola = leerCola();
  cola.push(item);
  escribirCola(cola);
  return item;
}

export function removerGestionOutbox(id: string): void {
  escribirCola(leerCola().filter((x) => x.id !== id));
}

export function marcarErrorGestionOutbox(id: string, error: string): void {
  const cola = leerCola().map((x) =>
    x.id === id ? { ...x, lastError: error } : x,
  );
  escribirCola(cola);
}
