/**
 * POST /api/auth/mfa/enable — confirma TOTP y activa MFA.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/api/error-handler';
import { mfaCodigoSchema } from '@/lib/validators/auth';
import { confirmarEnableMfa } from '@/lib/auth/mfa-service';
import { validarCsrfHeader } from '@/lib/security/csrf';
import {
  generateToken,
  remainingSessionSeconds,
  resolverSessionStartedAt,
  verifyToken,
} from '@/lib/auth/jwt';
import { obtenerPermisosUsuario } from '@/lib/permissions/permission-service';
import { obtenerMfaSetupRequired } from '@/lib/auth/mfa-session';
import { mensajeClienteSeguro } from '@/lib/errors/client-safe-message';
import { ZodError } from 'zod';

function obtenerToken(req: NextRequest): string | null {
  return req.cookies.get('auth-token')?.value ?? null;
}

export async function POST(req: NextRequest) {
  try {
    if (!validarCsrfHeader(req)) {
      return NextResponse.json(
        { success: false, error: 'Solicitud no autorizada.' },
        { status: 403 },
      );
    }

    const usuario = await getCurrentUser(req);
    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'No autenticado.' },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { codigo } = mfaCodigoSchema.parse(body);
    await confirmarEnableMfa(usuario.idusuario, codigo);

    const tokenActual = obtenerToken(req);
    if (!tokenActual) {
      return NextResponse.json({ success: true, mfaSetupRequired: false });
    }

    const payloadActual = verifyToken(tokenActual);
    const sessionStartedAt = resolverSessionStartedAt(payloadActual);
    const remaining = remainingSessionSeconds(sessionStartedAt);
    const ahora = Math.floor(Date.now() / 1000);
    const permisos = await obtenerPermisosUsuario(usuario.idusuario);
    const mfaSetupRequired = await obtenerMfaSetupRequired(usuario.idusuario);

    const tokenNuevo = generateToken(
      {
        idusuario: usuario.idusuario,
        email: usuario.email,
        nombre: usuario.nombre,
        idrol: usuario.idrol,
        permisos,
        sessionStartedAt,
        lastActivityAt: ahora,
        permisosAt: ahora,
        mfaSetupRequired,
      },
      remaining > 0 ? remaining : undefined,
    );

    const response = NextResponse.json({
      success: true,
      mfaSetupRequired,
    });
    response.cookies.set('auth-token', tokenNuevo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: remaining > 0 ? remaining : 60 * 60 * 8,
      path: '/',
    });
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return handleApiError(error);
    }
    return NextResponse.json(
      {
        success: false,
        error: mensajeClienteSeguro(error, 'No se pudo activar MFA.'),
      },
      { status: 400 },
    );
  }
}
