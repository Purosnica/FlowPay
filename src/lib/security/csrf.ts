/**
 * Mitigación CSRF: header custom + cookie double-submit + Origin/Referer.
 */

export const CSRF_HEADER = 'x-flowpay-request';
export const CSRF_HEADER_VALUE = '1';
export const CSRF_TOKEN_HEADER = 'x-flowpay-csrf';
export const CSRF_COOKIE = 'flowpay-csrf';

function hostDeUrl(valor: string): string | null {
  try {
    return new URL(valor).host;
  } catch {
    return null;
  }
}

function hostDeRequest(request: Request): string | null {
  const headerHost = request.headers.get('host');
  if (headerHost) {
    return headerHost;
  }
  return hostDeUrl(request.url);
}

/**
 * Exige Origin o Referer del mismo host. Sin ambos → rechazar.
 */
function origenCoincideConHost(request: Request): boolean {
  const host = hostDeRequest(request);
  if (!host) {
    return false;
  }

  const origin = request.headers.get('origin');
  if (origin) {
    return hostDeUrl(origin) === host;
  }

  const referer = request.headers.get('referer');
  if (referer) {
    return hostDeUrl(referer) === host;
  }

  return false;
}

function leerCookie(
  cookieHeader: string | null,
  nombre: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }
  const partes = cookieHeader.split(';');
  for (const parte of partes) {
    const [k, ...rest] = parte.trim().split('=');
    if (k === nombre) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

export function generarTokenCsrf(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function validarCsrfHeader(request: Request): boolean {
  if (request.headers.get(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
    return false;
  }
  if (!origenCoincideConHost(request)) {
    return false;
  }

  const cookieToken = leerCookie(
    request.headers.get('cookie'),
    CSRF_COOKIE,
  );
  // Bootstrap (p. ej. login antes de cookie): Origin/Referer + header custom.
  if (!cookieToken) {
    return true;
  }

  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);
  return Boolean(headerToken && headerToken === cookieToken);
}

export function csrfCookieOptions(maxAgeSec = 60 * 60 * 8): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  };
}

/** Headers para fetch del cliente (incluye token de cookie si existe). */
export function csrfHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    [CSRF_HEADER]: CSRF_HEADER_VALUE,
  };

  if (typeof document !== 'undefined') {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${CSRF_COOKIE}=`));
    if (match) {
      const value = decodeURIComponent(match.slice(CSRF_COOKIE.length + 1));
      if (value) {
        headers[CSRF_TOKEN_HEADER] = value;
      }
    }
  }

  return headers;
}
