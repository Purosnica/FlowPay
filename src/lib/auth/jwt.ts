/**
 * UTILIDADES JWT PARA AUTENTICACIÓN
 *
 * Maneja la creación y verificación de tokens JWT
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require('jsonwebtoken');

import { getJwtSecret } from '@/lib/middleware/jwt-secret';
import {
  SESSION_ABSOLUTE_SECONDS,
  remainingSessionSeconds,
  resolverSessionStartedAt,
} from '@/lib/auth/session-ttl';

const JWT_SECRET_FINAL = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export {
  SESSION_ABSOLUTE_SECONDS,
  remainingSessionSeconds,
  resolverSessionStartedAt,
};

export interface JWTPayload {
  idusuario: number;
  email: string;
  nombre: string;
  idrol: number;
  permisos?: string[];
  /** Epoch seconds del inicio de sesión (login). */
  sessionStartedAt?: number;
  /** Epoch seconds de la última carga de permisos desde BD. */
  permisosAt?: number;
  iat?: number;
}

/**
 * Genera un token JWT para un usuario
 */
export function generateToken(
  payload: JWTPayload,
  expiresInSeconds?: number,
): string {
  const now = Math.floor(Date.now() / 1000);
  const sessionStartedAt = payload.sessionStartedAt ?? now;
  const permisosAt = payload.permisosAt ?? now;
  const { iat: _iat, ...rest } = payload;
  void _iat;

  return jwt.sign(
    { ...rest, sessionStartedAt, permisosAt },
    JWT_SECRET_FINAL as string,
    {
      expiresIn:
        expiresInSeconds != null && expiresInSeconds > 0
          ? expiresInSeconds
          : JWT_EXPIRES_IN,
    },
  );
}

/**
 * Verifica y decodifica un token JWT
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET_FINAL as string,
    ) as JWTPayload;
    return decoded;
  } catch {
    throw new Error('Token inválido o expirado');
  }
}

/**
 * Decodifica un token sin verificar (útil para debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
