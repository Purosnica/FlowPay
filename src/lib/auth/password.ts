/**
 * Hash y verificación de contraseñas (bcrypt únicamente — I016).
 */

import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/**
 * Genera un hash bcrypt (el salt va embebido en el hash).
 */
export async function hashPassword(
  password: string,
): Promise<{ hash: string; salt: string }> {
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  return { hash, salt: '' };
}

/**
 * Verifica una contraseña contra un hash bcrypt.
 */
export async function verifyPassword(
  password: string,
  hash: string,
  _salt?: string,
): Promise<boolean> {
  if (!isBcryptHash(hash)) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

/**
 * Verifica si el hash es bcrypt ($2a$ / $2b$ / $2y$).
 */
export function isBcryptHash(hash: string): boolean {
  return (
    hash.startsWith('$2a$') ||
    hash.startsWith('$2b$') ||
    hash.startsWith('$2y$')
  );
}
