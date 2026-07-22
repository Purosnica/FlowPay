/**
 * MIDDLEWARE DE NEXT.JS
 *
 * Protege rutas que requieren autenticación
 * SIEMPRE redirige a /login si no hay token
 * Agrega headers de seguridad
 */

import { NextResponse, type NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/middleware/jwt-edge';
import {
  obtenerReglaPermisoRuta,
  usuarioTieneAccesoRuta,
} from '@/lib/navigation/route-permissions';
import { applySecurityHeaders } from '@/lib/security/security-headers';
import {
  CSRF_COOKIE,
  csrfCookieOptions,
  generarTokenCsrf,
  validarCsrfHeader,
} from '@/lib/security/csrf';
import {
  debeRefrescarActividad,
  permisosJwtEstanFrescos,
  remainingIdleSeconds,
  remainingSessionSeconds,
  resolverLastActivityAt,
  resolverSessionStartedAt,
} from '@/lib/auth/session-ttl';
import { reemitirTokenConActividad } from '@/lib/auth/session-activity-edge';

// Rutas públicas que no requieren autenticación
const publicRoutes = ['/login'];

// Rutas de API públicas que no requieren autenticación
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/refresh-session',
  '/api/auth/mfa/verify',
  '/api/health',
  '/api/ready',
];

/** Con MFA pendiente de setup: solo perfil + endpoints MFA/sesión. */
const MFA_SETUP_PAGE_PREFIXES = ['/perfil'];
const MFA_SETUP_API_PREFIXES = [
  '/api/auth/mfa/',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/auth/refresh-session',
];

function rutaPermitidaConMfaSetup(pathname: string): boolean {
  if (MFA_SETUP_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  return MFA_SETUP_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
}

// Cron: autenticación propia vía CRON_SECRET en el handler
const cronApiPrefix = '/api/cron/';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function requiereCsrf(pathname: string, method: string): boolean {
  if (!MUTATING_METHODS.has(method)) {
    return false;
  }
  if (pathname.startsWith(cronApiPrefix)) {
    return false;
  }
  if (pathname.startsWith('/api/auth/login')) {
    return false;
  }
  return pathname.startsWith('/api');
}

function asegurarCookieCsrf(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, generarTokenCsrf(), csrfCookieOptions());
  }
  return response;
}

function responderConSeguridad(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  applySecurityHeaders(response);
  return asegurarCookieCsrf(request, response);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (requiereCsrf(pathname, request.method) && !validarCsrfHeader(request)) {
    return responderConSeguridad(
      request,
      NextResponse.json(
        { success: false, error: 'Solicitud no autorizada.' },
        { status: 403 },
      ),
    );
  }

  // Excluir assets estáticos y rutas internas de Next.js PRIMERO
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(
      /\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)$/,
    )
  ) {
    return NextResponse.next();
  }

  // Permitir rutas públicas de páginas (con headers de seguridad)
  if (publicRoutes.includes(pathname)) {
    return responderConSeguridad(request, NextResponse.next());
  }

  // Permitir rutas de API públicas (con headers de seguridad)
  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return responderConSeguridad(request, NextResponse.next());
  }

  // Cron operativo: auth Bearer CRON_SECRET en el route handler
  if (pathname.startsWith(cronApiPrefix)) {
    return responderConSeguridad(request, NextResponse.next());
  }

  // Verificar token en cookie
  const token = request.cookies.get('auth-token')?.value;

  // SI NO HAY TOKEN, SIEMPRE REDIRIGIR A LOGIN
  if (!token || token.trim() === '') {
    // Si es una API route protegida, retornar 401
    if (pathname.startsWith('/api')) {
      return responderConSeguridad(
        request,
        NextResponse.json(
          { success: false, error: 'No autenticado' },
          { status: 401 },
        ),
      );
    }

    // Para CUALQUIER otra ruta (incluyendo "/"), redirigir a login
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/login' && pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return responderConSeguridad(request, NextResponse.redirect(loginUrl));
  }

  const payload = await verifyTokenEdge(token);
  if (!payload) {
    if (pathname.startsWith('/api')) {
      return responderConSeguridad(
        request,
        NextResponse.json(
          { success: false, error: 'Token inválido o expirado' },
          { status: 401 },
        ),
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return responderConSeguridad(request, NextResponse.redirect(loginUrl));
  }

  const sessionStartedAt = resolverSessionStartedAt(payload);
  const remainingAbs = remainingSessionSeconds(sessionStartedAt);
  if (remainingAbs <= 0) {
    if (pathname.startsWith('/api')) {
      return responderConSeguridad(
        request,
        NextResponse.json(
          { success: false, error: 'Sesión expirada' },
          { status: 401 },
        ),
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return responderConSeguridad(request, NextResponse.redirect(loginUrl));
  }

  const lastActivityAt = resolverLastActivityAt(payload);
  if (remainingIdleSeconds(lastActivityAt) <= 0) {
    if (pathname.startsWith('/api')) {
      return responderConSeguridad(
        request,
        NextResponse.json(
          { success: false, error: 'Sesión inactiva. Inicia sesión de nuevo.' },
          { status: 401 },
        ),
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return responderConSeguridad(request, NextResponse.redirect(loginUrl));
  }

  const response = NextResponse.next();
  if (debeRefrescarActividad(lastActivityAt)) {
    const ahora = Math.floor(Date.now() / 1000);
    const tokenNuevo = await reemitirTokenConActividad(
      payload,
      ahora,
      remainingAbs,
    );
    response.cookies.set('auth-token', tokenNuevo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: remainingAbs,
      path: '/',
    });
  }

  if (payload.mfaSetupRequired && !rutaPermitidaConMfaSetup(pathname)) {
    if (pathname.startsWith('/api')) {
      return responderConSeguridad(
        request,
        NextResponse.json(
          {
            success: false,
            error: 'Debe activar MFA antes de continuar.',
            code: 'MFA_SETUP_REQUIRED',
          },
          { status: 403 },
        ),
      );
    }
    const perfilUrl = new URL('/perfil', request.url);
    perfilUrl.searchParams.set('mfa', 'required');
    return responderConSeguridad(request, NextResponse.redirect(perfilUrl));
  }

  const regla = obtenerReglaPermisoRuta(pathname);
  if (regla && !permisosJwtEstanFrescos(payload.permisosAt)) {
    if (pathname.startsWith('/api')) {
      return responderConSeguridad(
        request,
        NextResponse.json(
          {
            success: false,
            error: 'Permisos de sesión desactualizados. Recargue la página.',
          },
          { status: 401 },
        ),
      );
    }
    const refreshUrl = new URL('/api/auth/refresh-session', request.url);
    refreshUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
    return responderConSeguridad(request, NextResponse.redirect(refreshUrl));
  }

  // Verificar permisos de ruta (JWT incluye permisos del rol)
  if (regla) {
    const permisos = payload.permisos ?? [];
    if (!usuarioTieneAccesoRuta(permisos, regla)) {
      if (pathname.startsWith('/api')) {
        return responderConSeguridad(
          request,
          NextResponse.json(
            { success: false, error: 'No tiene permisos para esta acción.' },
            { status: 403 },
          ),
        );
      }
      const deniedUrl = new URL('/dashboard', request.url);
      deniedUrl.searchParams.set('error', 'sin_permiso');
      return responderConSeguridad(request, NextResponse.redirect(deniedUrl));
    }
  }

  return responderConSeguridad(request, response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
