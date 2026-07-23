/**
 * POST /api/auth/mfa/disable — desactiva MFA con código TOTP.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/api/error-handler';
import { mfaCodigoSchema } from '@/lib/validators/auth';
import { desactivarMfa } from '@/lib/auth/mfa-service';
import { validarCsrfHeader } from '@/lib/security/csrf';
import { mensajeClienteSeguro } from '@/lib/errors/client-safe-message';
import { ZodError } from 'zod';

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
    await desactivarMfa(usuario.idusuario, codigo);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleApiError(error);
    }
    return NextResponse.json(
      {
        success: false,
        error: mensajeClienteSeguro(error, 'No se pudo desactivar MFA.'),
      },
      { status: 400 },
    );
  }
}
