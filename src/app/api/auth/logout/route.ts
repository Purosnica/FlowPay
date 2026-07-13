/**
 * API ROUTE: LOGOUT
 *
 * POST /api/auth/logout
 * Cierra la sesión del usuario
 */

import { type NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware/auth';
import { CSRF_COOKIE } from '@/lib/security/csrf';

function limpiarCookiesSesion(response: NextResponse): void {
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  response.cookies.set(CSRF_COOKIE, '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

/**
 * POST /api/auth/logout
 * Logout de usuario
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);

    const response = NextResponse.json({
      success: true,
      message: 'Sesión cerrada exitosamente',
    });
    limpiarCookiesSesion(response);
    return response;
  } catch {
    const response = NextResponse.json(
      {
        success: true,
        message: 'Sesión cerrada',
      },
      { status: 200 },
    );
    limpiarCookiesSesion(response);
    return response;
  }
}



