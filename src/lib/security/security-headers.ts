import type { NextResponse } from 'next/server';

/**
 * Headers de seguridad estándar para respuestas HTTP.
 */
export function applySecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const isDev = process.env.NODE_ENV !== 'production';
  // Next.js / React requieren unsafe-inline en estilos; unsafe-eval solo en dev.
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  const connectSrc = ["'self'"];
  if (isDev) {
    connectSrc.push('ws:', 'wss:');
  }
  const configuredApi = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredApi) {
    try {
      const apiOrigin = new URL(configuredApi).origin;
      if (!connectSrc.includes(apiOrigin)) {
        connectSrc.push(apiOrigin);
      }
    } catch {
      // URL inválida: no ampliar connect-src
    }
  }

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }
}
