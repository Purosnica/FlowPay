/**
 * API ROUTE: USUARIO ACTUAL
 *
 * GET /api/auth/me
 * Obtiene la información del usuario autenticado
 */

import { type NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/api/error-handler';
import { obtenerPermisosUsuario } from '@/lib/permissions/permission-service';
import {
  generateToken,
  remainingSessionSeconds,
  resolverSessionStartedAt,
  verifyToken,
} from '@/lib/auth/jwt';
import { getUserById } from '@/lib/auth/auth-service';
import {
  CSRF_COOKIE,
  csrfCookieOptions,
  generarTokenCsrf,
} from '@/lib/security/csrf';

function obtenerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }
  return req.cookies.get('auth-token')?.value ?? null;
}

/**
 * GET /api/auth/me
 * Obtener usuario actual
 */
export async function GET(req: NextRequest) {
  try {
    const usuario = await getCurrentUser(req);

    if (!usuario) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autenticado. Por favor, inicia sesión.',
        },
        { status: 401 },
      );
    }

    const tokenActual = obtenerToken(req);
    if (!tokenActual) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autenticado. Por favor, inicia sesión.',
        },
        { status: 401 },
      );
    }

    const payloadActual = verifyToken(tokenActual);
    const sessionStartedAt = resolverSessionStartedAt(payloadActual);
    const remaining = remainingSessionSeconds(sessionStartedAt);

    if (remaining <= 0) {
      const expired = NextResponse.json(
        {
          success: false,
          error: 'Sesión expirada. Por favor, inicia sesión.',
        },
        { status: 401 },
      );
      expired.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
      return expired;
    }

    const permisos = await obtenerPermisosUsuario(usuario.idusuario);
    const usuarioCompleto = await getUserById(usuario.idusuario);

    const tokenNuevo = generateToken(
      {
        idusuario: usuario.idusuario,
        email: usuario.email,
        nombre: usuario.nombre,
        idrol: usuario.idrol,
        permisos,
        sessionStartedAt,
        permisosAt: Math.floor(Date.now() / 1000),
      },
      remaining,
    );

    const response = NextResponse.json({
      success: true,
      usuario: {
        ...usuario,
        rolCodigo: usuarioCompleto?.rol?.codigo ?? '',
      },
      permisos,
    });

    response.cookies.set('auth-token', tokenNuevo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: remaining,
      path: '/',
    });
    if (!req.cookies.get(CSRF_COOKIE)?.value) {
      response.cookies.set(
        CSRF_COOKIE,
        generarTokenCsrf(),
        csrfCookieOptions(),
      );
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
