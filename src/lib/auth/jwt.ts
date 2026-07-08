/**
 * UTILIDADES JWT PARA AUTENTICACIÓN
 * 
 * Maneja la creación y verificación de tokens JWT
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require("jsonwebtoken");

import { getJwtSecret } from '@/lib/middleware/jwt-secret';

const JWT_SECRET_FINAL = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export interface JWTPayload {
  idusuario: number;
  email: string;
  nombre: string;
  idrol: number;
  permisos?: string[];
}

/**
 * Genera un token JWT para un usuario
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET_FINAL as string, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verifica y decodifica un token JWT
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_FINAL as string) as JWTPayload;
    return decoded;
  } catch {
    throw new Error("Token inválido o expirado");
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



