/**
 * Sentry solo para Node/servidor (@sentry/node).
 * No importar desde Client Components ni módulos del navegador.
 */

let serverInitialized = false;

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
}
