import { NextResponse, type NextRequest } from 'next/server';
import { requirePermission } from '@/lib/middleware/auth';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { handleApiError } from '@/lib/api/error-handler';
import { leerDocumentoCobranza, esNombreArchivoDocumentoSeguro } from '@/lib/cobranza/documento-storage';
import { prisma } from '@/lib/prisma';
import {
  requerirAccesoCliente,
  requerirAccesoMandante,
} from '@/lib/cobranza/mandante-scope';
import {
  requerirAccesoClienteCobrador,
  requerirAccesoPrestamoCobrador,
} from '@/lib/cobranza/cobrador-scope';

type RouteContext = {
  params: Promise<{ nombre: string }>;
};

export async function GET(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const usuario = await requirePermission(req, PERMISO.CARTERA_READ);
    const { nombre } = await context.params;

    if (!esNombreArchivoDocumentoSeguro(nombre)) {
      return NextResponse.json(
        { success: false, error: 'Archivo no encontrado.' },
        { status: 404 },
      );
    }

    const urlApi = `/api/cobranza/documentos/file/${nombre}`;
    const urlLegacy = `/uploads/cobranza/${nombre}`;
    const doc = await prisma.tbl_documento.findFirst({
      where: {
        deletedAt: null,
        OR: [{ url: urlApi }, { url: urlLegacy }],
      },
      include: {
        prestamo: {
          select: { idprestamo: true, idmandante: true, deletedAt: true },
        },
      },
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, error: 'Archivo no encontrado.' },
        { status: 404 },
      );
    }

    if (doc.prestamo && !doc.prestamo.deletedAt) {
      await requerirAccesoMandante(
        usuario.idusuario,
        doc.prestamo.idmandante,
      );
      await requerirAccesoPrestamoCobrador(
        usuario.idusuario,
        doc.prestamo.idprestamo,
      );
    } else if (doc.idcliente) {
      await requerirAccesoCliente(usuario.idusuario, doc.idcliente);
      await requerirAccesoClienteCobrador(usuario.idusuario, doc.idcliente);
    } else {
      return NextResponse.json(
        { success: false, error: 'Archivo no encontrado.' },
        { status: 404 },
      );
    }

    const archivo = await leerDocumentoCobranza(nombre);
    if (!archivo) {
      return NextResponse.json(
        { success: false, error: 'Archivo no encontrado.' },
        { status: 404 },
      );
    }

    return new NextResponse(new Uint8Array(archivo.buffer), {
      status: 200,
      headers: {
        'Content-Type': archivo.mime,
        'Content-Disposition': `attachment; filename="${nombre}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
