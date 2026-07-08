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
import { validarCsrfHeader } from '@/lib/security/csrf';

// Rutas públicas que no requieren autenticación
const publicRoutes = ['/login'];

// Rutas de API públicas que no requieren autenticación
const publicApiRoutes = ['/api/auth/login', '/api/auth/logout', '/api/auth/me'];

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

function responderConSeguridad(response: NextResponse): NextResponse {
  applySecurityHeaders(response);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (requiereCsrf(pathname, request.method) && !validarCsrfHeader(request)) {
    return responderConSeguridad(
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
    return responderConSeguridad(NextResponse.next());
  }

  // Permitir rutas de API públicas (con headers de seguridad)
  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return responderConSeguridad(NextResponse.next());
  }

  // Cron operativo: auth Bearer CRON_SECRET en el route handler
  if (pathname.startsWith(cronApiPrefix)) {
    return responderConSeguridad(NextResponse.next());
  }

  // Verificar token en cookie
  const token = request.cookies.get('auth-token')?.value;

  // SI NO HAY TOKEN, SIEMPRE REDIRIGIR A LOGIN
  if (!token || token.trim() === '') {
    // Si es una API route protegida, retornar 401
    if (pathname.startsWith('/api')) {
      return responderConSeguridad(
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
    return responderConSeguridad(NextResponse.redirect(loginUrl));
  }

  const payload = await verifyTokenEdge(token);
  if (!payload) {
    if (pathname.startsWith('/api')) {
      return responderConSeguridad(
        NextResponse.json(
          { success: false, error: 'Token inválido o expirado' },
          { status: 401 },
        ),
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return responderConSeguridad(NextResponse.redirect(loginUrl));
  }

  // Verificar permisos de ruta (JWT incluye permisos del rol)
  const regla = obtenerReglaPermisoRuta(pathname);
  if (regla) {
    const permisos = payload.permisos ?? [];
    if (!usuarioTieneAccesoRuta(permisos, regla)) {
      if (pathname.startsWith('/api')) {
        return responderConSeguridad(
          NextResponse.json(
            { success: false, error: 'No tiene permisos para esta acción.' },
            { status: 403 },
          ),
        );
      }
      const deniedUrl = new URL('/dashboard', request.url);
      deniedUrl.searchParams.set('error', 'sin_permiso');
      return responderConSeguridad(NextResponse.redirect(deniedUrl));
    }
  }

  return responderConSeguridad(NextResponse.next());
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
