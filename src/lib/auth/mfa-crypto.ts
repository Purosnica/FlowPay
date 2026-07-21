/**
 * Cifrado del secreto TOTP en reposo (AES-256-GCM).
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import { getJwtSecret } from '@/lib/middleware/jwt-secret';

function deriveKey(): Buffer {
  return scryptSync(getJwtSecret(), 'flowpay-mfa-v1', 32);
}

/** Formato: iv.tag.ciphertext (base64url). */
export function cifrarSecretoMfa(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(), iv);
  const enc = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString('base64url'),
    tag.toString('base64url'),
    enc.toString('base64url'),
  ].join('.');
}

export function descifrarSecretoMfa(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 3) {
    throw new Error('Secreto MFA inválido');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(data),
    decipher.final(),
  ]).toString('utf8');
}
