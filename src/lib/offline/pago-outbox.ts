/**
 * Cola local de pagos offline (paridad con gestiones I036).
 */

import { crearIdempotencyKey } from '@/lib/api/idempotency-key';

const STORAGE_KEY = 'flowpay.pago-outbox.v1';

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

function leerCola(): PagoOutboxItem[] {
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
    return parsed as PagoOutboxItem[];
  } catch {
    return [];
  }
}

function escribirCola(items: PagoOutboxItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('flowpay:pago-outbox'));
}

export function listarPagoOutbox(): PagoOutboxItem[] {
  return leerCola();
}

export function contarPagoOutbox(): number {
  return leerCola().length;
}

export function encolarPagoOutbox(
  input: Omit<PagoOutboxPayload, 'idempotencyKey'> & {
    idempotencyKey?: string;
  },
): PagoOutboxItem {
  const item: PagoOutboxItem = {
    id: crearIdempotencyKey('pout'),
    createdAt: new Date().toISOString(),
    payload: {
      ...input,
      idempotencyKey: input.idempotencyKey ?? crearIdempotencyKey('pago'),
    },
  };
  const cola = leerCola();
  cola.push(item);
  escribirCola(cola);
  return item;
}

export function removerPagoOutbox(id: string): void {
  escribirCola(leerCola().filter((x) => x.id !== id));
}

export function marcarErrorPagoOutbox(id: string, error: string): void {
  const cola = leerCola().map((x) =>
    x.id === id ? { ...x, lastError: error } : x,
  );
  escribirCola(cola);
}
