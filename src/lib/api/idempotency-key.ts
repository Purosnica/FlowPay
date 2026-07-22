/**
 * Idempotency-Key para imports REST (I059) y mutaciones financieras (I015).
 */

const KEY_RE = /^[a-zA-Z0-9_-]{8,64}$/;

export function parseIdempotencyKeyHeader(
  headerValue: string | null,
): string | undefined {
  if (!headerValue) {
    return undefined;
  }
  const trimmed = headerValue.trim();
  if (!KEY_RE.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function isValidIdempotencyKey(value: string): boolean {
  return KEY_RE.test(value.trim());
}

/** Genera key cliente/servidor (8–64, charset seguro). */
export function crearIdempotencyKey(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${suffix}`.slice(0, 64);
}

export function mensajeIdempotencyKeyInvalida(): string {
  return 'Idempotency-Key inválida (8–64 chars: letras, números, _ o -).';
}
