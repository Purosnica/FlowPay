import { NextResponse, type NextRequest } from 'next/server';
import { requirePermission } from '@/lib/middleware/auth';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { validarCsrfHeader } from '@/lib/security/csrf';
import { handleApiError } from '@/lib/api/error-handler';
import {
  encolarSmsCobro,
  EnviarSmsCobroSchema,
} from '@/lib/services/sms-service';
import { validarDestinatarioSmsCobro } from '@/lib/cobranza/sms-destinatario-service';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { requerirAccesoPrestamoCobrador } from '@/lib/cobranza/cobrador-scope';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    if (!validarCsrfHeader(req)) {
      return NextResponse.json(
        { success: false, error: 'Solicitud no válida (CSRF).' },
        { status: 403 },
      );
    }

    const usuario = await requirePermission(req, PERMISO.GESTION_WRITE);

    const body: unknown = await req.json();
    const parsed = EnviarSmsCobroSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: first?.message ?? 'Datos de entrada inválidos',
        },
        { status: 400 },
      );
    }

    const destinatario = await validarDestinatarioSmsCobro({
      idprestamo: parsed.data.idprestamo,
      telefono: parsed.data.telefono,
    });
    await requerirAccesoMandante(usuario.idusuario, destinatario.idmandante);
    await requerirAccesoPrestamoCobrador(
      usuario.idusuario,
      parsed.data.idprestamo,
    );

    const result = await encolarSmsCobro({
      input: parsed.data,
      idmandante: destinatario.idmandante,
      idusuario: usuario.idusuario,
      telefono: destinatario.telefono,
    });

    return NextResponse.json({
      success: true,
      idsms: result.idsms,
      estado: result.estado,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
