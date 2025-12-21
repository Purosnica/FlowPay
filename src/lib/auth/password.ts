/**
 * UTILIDADES DE HASH DE CONTRASEÑAS
 * 
 * Maneja el hashing y verificación de contraseñas usando bcrypt
 * 
 * NOTA: Este módulo soporta migración desde SHA-256 a bcrypt.
 * Los usuarios existentes con SHA-256 seguirán funcionando hasta que
 * actualicen su contraseña, momento en el cual se migrará a bcrypt.
 */

import * as bcrypt from "bcrypt";
import { createHash } from "crypto";

const BCRYPT_ROUNDS = 12; // Cost factor (recomendado: 10-12)

/**
 * Genera un hash de contraseña usando bcrypt
 * 
 * @param password Contraseña en texto plano
 * @returns Objeto con hash (incluye salt) y salt vacío (bcrypt incluye salt en el hash)
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // bcrypt incluye el salt en el hash, pero mantenemos compatibilidad con el formato anterior
  return { hash, salt: "" };
}

/**
 * Verifica una contraseña contra un hash bcrypt
 * 
 * @param password Contraseña en texto plano
 * @param hash Hash bcrypt (incluye salt)
 * @param salt Salt (ignorado para bcrypt, mantenido para compatibilidad)
 * @returns true si la contraseña es válida
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  // Si el hash es de bcrypt (empieza con $2a$, $2b$, o $2y$), usar bcrypt
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    return await bcrypt.compare(password, hash);
  }
  
  // Compatibilidad con SHA-256 antiguo (para migración)
  if (salt) {
    const passwordHash = createHash("sha256")
      .update(password + salt)
      .digest("hex");
    return passwordHash === hash;
  }
  
  return false;
}

/**
 * Genera un hash simple SHA-256 (para migración de datos existentes)
 * 
 * @deprecated Usar hashPassword con bcrypt en su lugar
 */
export function simpleHash(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/**
 * Verifica si un hash es de bcrypt
 */
export function isBcryptHash(hash: string): boolean {
  return hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$");
}



