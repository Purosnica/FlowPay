/**
 * Token corto para el paso MFA pendiente (post-password, pre-sesión).
 */

import { SignJWT, jwtVerify } from 'jose';
import { getJwtSecretKey } from '@/lib/middleware/jwt-secret';

export const MFA_PENDING_COOKIE = 'mfa-pending';
export const MFA_PENDING_TTL_SECONDS = 5 * 60;

type MfaPendingPayload = {
  purpose: 'mfa_pending';
  idusuario: number;
};

export async function emitirTokenMfaPending(
  idusuario: number,
): Promise<string> {
  return new SignJWT({
    purpose: 'mfa_pending',
    idusuario,
  } satisfies MfaPendingPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${MFA_PENDING_TTL_SECONDS}s`)
    .sign(getJwtSecretKey());
}

export async function verificarTokenMfaPending(
  token: string,
): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (payload.purpose !== 'mfa_pending') {
      return null;
    }
    const id = Number(payload.idusuario);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function mfaPendingCookieOptions(maxAge = MFA_PENDING_TTL_SECONDS) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  };
}
