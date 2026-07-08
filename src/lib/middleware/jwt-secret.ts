/**
 * Secret JWT compartido (Node + Edge).
 */

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET debe estar configurado en producción.',
      );
    }
    return 'your-super-secret-jwt-key-change-in-production';
  }
  return secret;
}

export function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}
