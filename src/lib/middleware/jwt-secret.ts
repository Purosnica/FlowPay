/**
 * Secret JWT compartido (Node + Edge).
 * Sin fallback hardcodeado (H26): falla si falta en cualquier entorno.
 */

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'JWT_SECRET debe estar configurado (mín. 16 caracteres en no-prod; 32 en producción).',
    );
  }
  const minLen = process.env.NODE_ENV === 'production' ? 32 : 16;
  if (secret.length < minLen) {
    throw new Error(
      `JWT_SECRET debe tener al menos ${minLen} caracteres.`,
    );
  }
  return secret;
}

export function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}
