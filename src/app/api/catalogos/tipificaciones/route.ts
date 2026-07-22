import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';
import {
  clienteTieneEtagFresco,
  etagFromPayload,
  headersCacheCatalogo,
} from '@/lib/http/etag';
import { cacheGetOrSet } from '@/lib/cache/cache-store';

export const dynamic = 'force-dynamic';

/**
 * I116: catálogo tipificaciones/estados con ETag + Cache-Control.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const usuario = await getCurrentUser(request);
  if (!usuario) {
    return NextResponse.json(
      { success: false, error: 'No autenticado.' },
      { status: 401 },
    );
  }

  const payload = await cacheGetOrSet(
    'catalog:tipificaciones-estados',
    60,
    async () => {
      const [acciones, resultados] = await Promise.all([
        prisma.tbl_codigo_accion.findMany({
          where: { estado: true, deletedAt: null },
          orderBy: { codigo: 'asc' },
          select: {
            idcodaccion: true,
            codigo: true,
            descripcion: true,
          },
        }),
        prisma.tbl_codigo_resultado.findMany({
          where: { estado: true, deletedAt: null },
          orderBy: { codigo: 'asc' },
          select: {
            idcodresultado: true,
            codigo: true,
            descripcion: true,
            grupo: true,
            tipoGestion: true,
          },
        }),
      ]);
      return { acciones, resultados };
    },
  );

  const body = JSON.stringify({ success: true, data: payload });
  const etag = etagFromPayload(body);

  if (clienteTieneEtagFresco(request, etag)) {
    return new NextResponse(null, {
      status: 304,
      headers: headersCacheCatalogo(etag),
    });
  }

  return new NextResponse(body, {
    status: 200,
    headers: headersCacheCatalogo(etag),
  });
}
