/**
 * GET /api/auth/mfa/status — estado MFA del usuario actual.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/api/error-handler';
import { prisma } from '@/lib/prisma';
import { usuarioPuedeGestionarMfa } from '@/lib/auth/mfa-service';

export async function GET(req: NextRequest) {
  try {
    const usuario = await getCurrentUser(req);
    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'No autenticado.' },
        { status: 401 },
      );
    }

    const row = await prisma.tbl_usuario.findFirst({
      where: { idusuario: usuario.idusuario },
      select: { mfaEnabled: true, mfaEnabledAt: true },
    });

    const canManage = await usuarioPuedeGestionarMfa(usuario.idusuario);

    return NextResponse.json({
      success: true,
      enabled: Boolean(row?.mfaEnabled),
      enabledAt: row?.mfaEnabledAt?.toISOString() ?? null,
      canManage,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
