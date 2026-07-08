/**
 * API ROUTE: LOGIN
 *
 * POST /api/auth/login
 * Autentica un usuario y establece cookie de sesión HTTP-only
 */

import { type NextRequest, NextResponse } from 'next/server';

import { authenticateUser } from '@/lib/auth/auth-service';
import { handleApiError } from '@/lib/api/error-handler';
import { loginSchema } from '@/lib/validators/auth';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/security/rate-limit-service';
import { getRequestInfo } from '@/lib/middleware/auth';
import { validarCsrfHeader } from '@/lib/security/csrf';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/auth/login
 * Login de usuario
 */
export async function POST(req: NextRequest) {
  try {
    if (!validarCsrfHeader(req)) {
      return NextResponse.json(
        { success: false, error: 'Solicitud no autorizada.' },
        { status: 403 },
      );
    }

    // Rate limiting por IP
    const requestInfo = getRequestInfo(req);
    const identifier = requestInfo.ip || 'unknown';
    const isAllowed = await checkRateLimit(
      `login:${identifier}`,
      RATE_LIMIT_CONFIG.LOGIN.maxRequests,
      RATE_LIMIT_CONFIG.LOGIN.windowMs,
    );

    if (!isAllowed) {
      logger.warn('Rate limit excedido en login', { ip: identifier });
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiados intentos de login. Por favor, intente más tarde.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(
              Math.ceil(RATE_LIMIT_CONFIG.LOGIN.windowMs / 1000),
            ),
          },
        },
      );
    }

    const body = await req.json();
    const credentials = loginSchema.parse(body);

    // Rate limiting por email
    const emailKey = `login:email:${credentials.email.toLowerCase()}`;
    const emailAllowed = await checkRateLimit(
      emailKey,
      RATE_LIMIT_CONFIG.LOGIN.maxRequests,
      RATE_LIMIT_CONFIG.LOGIN.windowMs,
    );
    if (!emailAllowed) {
      logger.warn('Rate limit excedido en login por email', {
        email: credentials.email,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiados intentos de login. Por favor, intente más tarde.',
        },
        { status: 429 },
      );
    }

    const result = await authenticateUser(credentials);

    if (!result.success || !result.token || !result.usuario) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Credenciales inválidas',
        },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      success: true,
      usuario: result.usuario,
      permisos: result.permisos ?? [],
    });

    response.cookies.set('auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
