/**
 * Cifrado AES-GCM para colas offline (SEC-01).
 * DEK en sessionStorage (muere con la sesión); payload en localStorage.
 */

const DEK_SESSION_KEY = 'flowpay.outbox-dek.v1';

export type OutboxEnvelopeV2 = {
  v: 2;
  iv: string;
  data: string;
};

function bytesToB64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function cryptoApi(): Crypto {
  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
    throw new Error('Web Crypto no disponible');
  }
  return globalThis.crypto;
}

async function importDek(raw: Uint8Array): Promise<CryptoKey> {
  const copy = new Uint8Array(raw);
  return cryptoApi().subtle.importKey(
    'raw',
    copy,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

function leerDekRaw(): Uint8Array | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  const existing = sessionStorage.getItem(DEK_SESSION_KEY);
  if (!existing) {
    return null;
  }
  try {
    return b64ToBytes(existing);
  } catch {
    return null;
  }
}

function asegurarDekRaw(): Uint8Array {
  const existing = leerDekRaw();
  if (existing && existing.length === 32) {
    return existing;
  }
  const raw = cryptoApi().getRandomValues(new Uint8Array(32));
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(DEK_SESSION_KEY, bytesToB64(raw));
  }
  return raw;
}

export function limpiarClaveOutboxSesion(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(DEK_SESSION_KEY);
}

export function esEnvelopeV2(value: unknown): value is OutboxEnvelopeV2 {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    v.v === 2 &&
    typeof v.iv === 'string' &&
    typeof v.data === 'string'
  );
}

export async function cifrarTextoOutbox(plaintext: string): Promise<string> {
  const key = await importDek(asegurarDekRaw());
  const iv = cryptoApi().getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await cryptoApi().subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  const envelope: OutboxEnvelopeV2 = {
    v: 2,
    iv: bytesToB64(iv),
    data: bytesToB64(new Uint8Array(cipher)),
  };
  return JSON.stringify(envelope);
}

export async function descifrarTextoOutbox(
  stored: string,
): Promise<string | null> {
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!esEnvelopeV2(parsed)) {
      return null;
    }
    const raw = leerDekRaw();
    if (!raw) {
      return null;
    }
    const key = await importDek(raw);
    const iv = b64ToBytes(parsed.iv);
    const data = b64ToBytes(parsed.data);
    const plain = await cryptoApi().subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
