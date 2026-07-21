/**
 * Reemisión de JWT en Edge (middleware) para refrescar lastActivityAt.
 */

import { SignJWT } from 'jose';
import type { JWTPayload } from '@/lib/auth/jwt';
import { getJwtSecretKey } from '@/lib/middleware/jwt-secret';

export async function reemitirTokenConActividad(
  payload: JWTPayload,
  lastActivityAt: number,
  expiresInSeconds: number,
): Promise<string> {
  const { iat: _iat, ...rest } = payload;
  void _iat;

  return new SignJWT({
    ...rest,
    lastActivityAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${Math.max(1, expiresInSeconds)}s`)
    .sign(getJwtSecretKey());
}
