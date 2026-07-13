/**
 * GET /api/auth/refresh-session
 * Renueva permisos del JWT desde BD y redirige a la ruta solicitada.
 */

import { type NextRequest, NextResponse } from 'next/server';

import {
  generateToken,
  remainingSessionSeconds,
  resolverSessionStartedAt,
  verifyToken,
} from '@/lib/auth/jwt';
import { getUserById } from '@/lib/auth/auth-service';
import { obtenerPermisosUsuario } from '@/lib/permissions/permission-service';
import {
  CSRF_COOKIE,
  csrfCookieOptions,
  generarTokenCsrf,
} from '@/lib/security/csrf';

function destinoSeguro(raw: string | null, origin: string): URL {
  const fallback = new URL('/dashboard', origin);
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return fallback;
  }
  try {
    return new URL(raw, origin);
  } catch {
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirectTo = destinoSeguro(
    req.nextUrl.searchParams.get('redirect'),
    origin,
  );
  const loginUrl = new URL('/login', origin);

  const token = req.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  const payload = verifyToken(token);
  if (!payload) {
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return res;
  }

  const sessionStartedAt = resolverSessionStartedAt(payload);
  const remaining = remainingSessionSeconds(sessionStartedAt);
  if (remaining <= 0) {
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return res;
  }

  const usuario = await getUserById(payload.idusuario);
  if (!usuario) {
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return res;
  }

  const permisos = await obtenerPermisosUsuario(usuario.idusuario);
  const tokenNuevo = generateToken(
    {
      idusuario: usuario.idusuario,
      email: usuario.email,
      nombre: usuario.nombre,
      idrol: usuario.idrol || 0,
      permisos,
      sessionStartedAt,
      permisosAt: Math.floor(Date.now() / 1000),
    },
    remaining,
  );

  const response = NextResponse.redirect(redirectTo);
  response.cookies.set('auth-token', tokenNuevo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: remaining,
    path: '/',
  });

  if (!req.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, generarTokenCsrf(), csrfCookieOptions());
  }

  return response;
}
