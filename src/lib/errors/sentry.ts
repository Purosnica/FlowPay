/**
 * Inicialización lazy de Sentry (cliente y servidor).
 * Sin DSN configurado no hace nada (cero costo / no rompe builds).
 */

type ClientErrorPayload = {
  error: {
    code: string;
    message: string;
    userMessage?: string;
    statusCode?: number;
    details?: Record<string, unknown>;
  };
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
};

let clientInitialized = false;
let serverInitialized = false;

function clientDsn(): string | undefined {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}

function serverDsn(): string | undefined {
  const dsn =
    process.env.SENTRY_DSN?.trim() ||
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}

export async function initSentryClient(): Promise<boolean> {
  const dsn = clientDsn();
  if (!dsn || typeof window === 'undefined') {
    return false;
  }
  if (clientInitialized) {
    return true;
  }
  const Sentry = await import('@sentry/browser');
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
  });
  clientInitialized = true;
  return true;
}

export async function captureClientErrorLog(
  errorLog: ClientErrorPayload,
): Promise<void> {
  const ready = await initSentryClient();
  if (!ready) {
    return;
  }
  const Sentry = await import('@sentry/browser');
  Sentry.captureException(new Error(errorLog.error.message), {
    tags: {
      code: errorLog.error.code,
      statusCode: String(errorLog.error.statusCode ?? ''),
    },
    extra: {
      userMessage: errorLog.error.userMessage,
      details: errorLog.error.details,
      url: errorLog.url,
      userAgent: errorLog.userAgent,
      userId: errorLog.userId,
      sessionId: errorLog.sessionId,
      timestamp: errorLog.timestamp,
    },
  });
}

export async function captureClientException(
  error: Error,
  extra?: Record<string, unknown>,
): Promise<void> {
  const ready = await initSentryClient();
  if (!ready) {
    return;
  }
  const Sentry = await import('@sentry/browser');
  Sentry.captureException(error, { extra });
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
