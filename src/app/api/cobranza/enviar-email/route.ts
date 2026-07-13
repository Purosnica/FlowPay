import { NextResponse, type NextRequest } from 'next/server';
import { requirePermission } from '@/lib/middleware/auth';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { validarCsrfHeader } from '@/lib/security/csrf';
import { handleApiError } from '@/lib/api/error-handler';
import {
  construirAsuntoCobro,
  enviarEmailCobro,
  EnviarEmailCobroSchema,
} from '@/lib/services/email-service';
import { validarDestinatarioEmailCobro } from '@/lib/cobranza/email-destinatario-service';
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
    const parsed = EnviarEmailCobroSchema.safeParse(body);
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

    const destinatario = await validarDestinatarioEmailCobro({
      idprestamo: parsed.data.idprestamo,
      to: parsed.data.to,
    });
    await requerirAccesoMandante(usuario.idusuario, destinatario.idmandante);
    await requerirAccesoPrestamoCobrador(
      usuario.idusuario,
      parsed.data.idprestamo,
    );

    const subject =
      parsed.data.subject.trim() ||
      construirAsuntoCobro(undefined, undefined);

    const result = await enviarEmailCobro({
      ...parsed.data,
      subject,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
