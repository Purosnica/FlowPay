/**
 * Idempotency-Key para imports REST (I059).
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

export function mensajeIdempotencyKeyInvalida(): string {
  return 'Idempotency-Key inválida (8–64 chars: letras, números, _ o -).';
}
