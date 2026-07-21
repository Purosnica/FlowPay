/**
 * Verificación JWT compatible con Edge (middleware Next.js).
 */

import { jwtVerify } from 'jose';
import type { JWTPayload } from '@/lib/auth/jwt';
import { getJwtSecretKey } from '@/lib/middleware/jwt-secret';

export async function verifyTokenEdge(
  token: string,
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());

    return {
      idusuario: Number(payload.idusuario),
      email: String(payload.email),
      nombre: String(payload.nombre),
      idrol: Number(payload.idrol),
      permisos: Array.isArray(payload.permisos)
        ? payload.permisos.map(String)
        : [],
      sessionStartedAt:
        typeof payload.sessionStartedAt === 'number'
          ? payload.sessionStartedAt
          : typeof payload.iat === 'number'
            ? payload.iat
            : undefined,
      lastActivityAt:
        typeof payload.lastActivityAt === 'number'
          ? payload.lastActivityAt
          : undefined,
      permisosAt:
        typeof payload.permisosAt === 'number'
          ? payload.permisosAt
          : typeof payload.iat === 'number'
            ? payload.iat
            : undefined,
      iat: typeof payload.iat === 'number' ? payload.iat : undefined,
    };
  } catch {
    return null;
  }
}
