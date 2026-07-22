/**
 * POST /api/auth/mfa/verify — completa login con código TOTP.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/error-handler';
import { mfaCodigoSchema } from '@/lib/validators/auth';
import { completarLoginConMfa } from '@/lib/auth/mfa-login';
import {
  MFA_PENDING_COOKIE,
  mfaPendingCookieOptions,
  verificarTokenMfaPending,
} from '@/lib/auth/mfa-pending';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/security/rate-limit-service';
import { getRequestInfo } from '@/lib/middleware/auth';
import {
  CSRF_COOKIE,
  csrfCookieOptions,
  generarTokenCsrf,
  validarCsrfHeader,
} from '@/lib/security/csrf';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    if (!validarCsrfHeader(req)) {
      return NextResponse.json(
        { success: false, error: 'Solicitud no autorizada.' },
        { status: 403 },
      );
    }

    const requestInfo = getRequestInfo(req);
    const ip = requestInfo.ip || 'unknown';
    const allowed = await checkRateLimit(
      `mfa:${ip}`,
      RATE_LIMIT_CONFIG.LOGIN.maxRequests,
      RATE_LIMIT_CONFIG.LOGIN.windowMs,
    );
    if (!allowed) {
      logger.warn('Rate limit excedido en MFA verify', { ip });
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiados intentos. Intente más tarde.',
        },
        { status: 429 },
      );
    }

    const pending = req.cookies.get(MFA_PENDING_COOKIE)?.value;
    if (!pending) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sesión MFA expirada. Inicie sesión de nuevo.',
        },
        { status: 401 },
      );
    }

    const idusuario = await verificarTokenMfaPending(pending);
    if (idusuario == null) {
      const res = NextResponse.json(
        {
          success: false,
          error: 'Sesión MFA inválida. Inicie sesión de nuevo.',
        },
        { status: 401 },
      );
      res.cookies.set(MFA_PENDING_COOKIE, '', {
        ...mfaPendingCookieOptions(0),
        maxAge: 0,
      });
      return res;
    }

    const body = await req.json();
    const { codigo } = mfaCodigoSchema.parse(body);
    const result = await completarLoginConMfa(idusuario, codigo);

    if (!result.success || !result.token || !result.usuario) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Código MFA inválido',
        },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      success: true,
      usuario: result.usuario,
      permisos: result.permisos ?? [],
      mfaSetupRequired: Boolean(result.mfaSetupRequired),
    });

    response.cookies.set('auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });
    response.cookies.set(MFA_PENDING_COOKIE, '', {
      ...mfaPendingCookieOptions(0),
      maxAge: 0,
    });
    response.cookies.set(CSRF_COOKIE, generarTokenCsrf(), csrfCookieOptions());

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
