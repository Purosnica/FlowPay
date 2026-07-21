/**
 * POST /api/auth/mfa/setup — genera secreto TOTP (ADMIN/GERENTE).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/api/error-handler';
import { iniciarSetupMfa } from '@/lib/auth/mfa-service';
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

    const setup = await iniciarSetupMfa(usuario.idusuario);
    return NextResponse.json({
      success: true,
      secret: setup.secret,
      otpauthUrl: setup.otpauthUrl,
    });
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
