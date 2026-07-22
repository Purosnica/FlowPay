/**
 * Retry con backoff exponencial para operaciones transitorias (SMTP, etc.).
 */

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 5_000;

  let ultimoError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      ultimoError = err;
      if (attempt >= maxAttempts) {
        break;
      }
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      await sleep(delay);
    }
  }
  throw ultimoError instanceof Error
    ? ultimoError
    : new Error('Operación fallida tras reintentos');
}
