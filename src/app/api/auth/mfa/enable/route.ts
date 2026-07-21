/**
 * POST /api/auth/mfa/enable — confirma TOTP y activa MFA.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/api/error-handler';
import { mfaCodigoSchema } from '@/lib/validators/auth';
import { confirmarEnableMfa } from '@/lib/auth/mfa-service';
import { validarCsrfHeader } from '@/lib/security/csrf';

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

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    return handleApiError(error);
  }
}
