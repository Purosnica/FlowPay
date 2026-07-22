/**
 * Secret JWT compartido (Node + Edge).
 * Sin fallback hardcodeado (H26): mínimo 32 caracteres en todo entorno.
 */

export const JWT_SECRET_MIN_LENGTH = 32;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      `JWT_SECRET debe estar configurado (mín. ${JWT_SECRET_MIN_LENGTH} caracteres).`,
    );
  }
  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET debe tener al menos ${JWT_SECRET_MIN_LENGTH} caracteres.`,
    );
  }
  return secret;
}

export function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}
