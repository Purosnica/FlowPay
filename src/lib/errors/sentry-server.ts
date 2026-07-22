/**
 * Sentry solo para Node/servidor (@sentry/node).
 * No importar desde Client Components ni módulos del navegador.
 * Circuit breaker I011: fallos de Sentry no degradan el request path.
 */

import { getCircuitBreaker } from '@/lib/resilience/circuit-breaker';

let serverInitialized = false;

const sentryBreaker = getCircuitBreaker('sentry', {
  failureThreshold: 3,
  cooldownMs: 60_000,
  successThreshold: 1,
});

function serverDsn(): string | undefined {
  const dsn =
    process.env.SENTRY_DSN?.trim() ||
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}

export async function captureServerException(
  error: Error,
  context?: Record<string, unknown>,
): Promise<void> {
  const dsn = serverDsn();
  if (!dsn) {
    return;
  }
  if (!sentryBreaker.allowRequest()) {
    return;
  }
  try {
    const Sentry = await import('@sentry/node');
    if (!serverInitialized) {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0,
      });
      serverInitialized = true;
    }
    Sentry.captureException(error, { extra: context });
    sentryBreaker.recordSuccess();
  } catch {
    sentryBreaker.recordFailure();
  }
}
