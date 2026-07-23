/**
 * Unit SEC-01: TTL outbox + cifrado AES-GCM (Web Crypto en Node).
 */
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { crearIdempotencyKey } from '@/lib/api/idempotency-key';
import {
  filtrarOutboxPorTtl,
  OUTBOX_TTL_MS,
} from '@/lib/offline/outbox-storage';
import {
  cifrarTextoOutbox,
  descifrarTextoOutbox,
  esEnvelopeV2,
  limpiarClaveOutboxSesion,
} from '@/lib/offline/outbox-crypto';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

const memorySession = new Map<string, string>();
const memoryLocal = new Map<string, string>();

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => memorySession.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memorySession.set(k, v);
    },
    removeItem: (k: string) => {
      memorySession.delete(k);
    },
  },
});

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => memoryLocal.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memoryLocal.set(k, v);
    },
    removeItem: (k: string) => {
      memoryLocal.delete(k);
    },
  },
});

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    localStorage: globalThis.localStorage,
    dispatchEvent: () => true,
  },
});

function testKeys(): void {
  const a = crearIdempotencyKey('ges');
  const b = crearIdempotencyKey('ges');
  assert.ok(a.length >= 8 && a.length <= 64);
  assert.notEqual(a, b);
}

function testTtl(): void {
  const now = Date.parse('2026-07-22T12:00:00.000Z');
  const vivos = filtrarOutboxPorTtl(
    [
      {
        id: 'ok',
        createdAt: new Date(now - OUTBOX_TTL_MS + 60_000).toISOString(),
      },
      {
        id: 'exp',
        createdAt: new Date(now - OUTBOX_TTL_MS - 60_000).toISOString(),
      },
    ],
    now,
  );
  assert.equal(vivos.length, 1);
  assert.equal(vivos[0]?.id, 'ok');
}

async function testCifrado(): Promise<void> {
  memorySession.clear();
  memoryLocal.clear();
  const plain = JSON.stringify([{ id: '1', monto: 150.5 }]);
  const cipher = await cifrarTextoOutbox(plain);
  const envelope: unknown = JSON.parse(cipher);
  assert.equal(esEnvelopeV2(envelope), true);
  assert.ok(!cipher.includes('150.5'));
  const roundtrip = await descifrarTextoOutbox(cipher);
  assert.equal(roundtrip, plain);

  limpiarClaveOutboxSesion();
  const sinClave = await descifrarTextoOutbox(cipher);
  assert.equal(sinClave, null);
}

testKeys();
testTtl();
void (async () => {
  await testCifrado();
  console.warn('ux/offline unit helpers + crypto: OK');
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
