import { NextResponse, type NextRequest } from 'next/server';
import { requirePermission } from '@/lib/middleware/auth';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  MAX_DOCUMENTO_FILE_BYTES,
  mensajeArchivoExcedeLimite,
} from '@/lib/cobranza/upload-limits';
import { handleApiError } from '@/lib/api/error-handler';
import {
  MIME_A_EXTENSION,
  guardarDocumentoCobranza,
} from '@/lib/cobranza/documento-storage';
import { prisma } from '@/lib/prisma';
import {
  requerirAccesoCliente,
  requerirAccesoMandante,
} from '@/lib/cobranza/mandante-scope';
import {
  requerirAccesoClienteCobrador,
  requerirAccesoPrestamoCobrador,
} from '@/lib/cobranza/cobrador-scope';

function parseIdPositivo(valor: FormDataEntryValue | null): number | null {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return null;
  }
  const n = Number.parseInt(valor, 10);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const usuario = await requirePermission(req, PERMISO.CARTERA_WRITE);
    const formData = await req.formData();
    const archivo = formData.get('archivo');
    const idprestamo = parseIdPositivo(formData.get('idprestamo'));
    const idcliente = parseIdPositivo(formData.get('idcliente'));

    if (!idprestamo && !idcliente) {
      return NextResponse.json(
        { success: false, error: 'Indique idprestamo o idcliente.' },
        { status: 400 },
      );
    }

    if (idprestamo) {
      const prestamo = await prisma.tbl_prestamo.findUnique({
        where: { idprestamo },
        select: { idmandante: true, deletedAt: true },
      });
      if (!prestamo || prestamo.deletedAt) {
        return NextResponse.json(
          { success: false, error: 'Préstamo no encontrado.' },
          { status: 404 },
        );
      }
      await requerirAccesoMandante(usuario.idusuario, prestamo.idmandante);
      await requerirAccesoPrestamoCobrador(usuario.idusuario, idprestamo);
    }
    if (idcliente) {
      await requerirAccesoCliente(usuario.idusuario, idcliente);
      await requerirAccesoClienteCobrador(usuario.idusuario, idcliente);
    }

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Archivo requerido.' },
        { status: 400 },
      );
    }
    if (archivo.size > MAX_DOCUMENTO_FILE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: mensajeArchivoExcedeLimite(MAX_DOCUMENTO_FILE_BYTES),
        },
        { status: 400 },
      );
    }
    if (!(archivo.type in MIME_A_EXTENSION)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de archivo no permitido.' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const { url } = await guardarDocumentoCobranza(buffer, archivo.type);

    return NextResponse.json({
      success: true,
      url,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('no permitido') ||
        error.message.includes('no coincide') ||
        error.message.includes('acceso'))
    ) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 },
      );
    }
    return handleApiError(error);
  }
}
