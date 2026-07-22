import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/middleware/auth';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  crearExportacionJob,
  dispararProcesamientoExportaciones,
  obtenerExportacionJob,
  obtenerRutaArchivoExport,
  requiereExportAsync,
} from '@/lib/cobranza/exportacion-job-service';
import { EXPORT_ASYNC_ROW_THRESHOLD } from '@/lib/cobranza/performance-limits';
import { readFile } from 'node:fs/promises';

export const maxDuration = 60;

const CreateSchema = z.object({
  tipo: z.string().min(1).max(80),
  filasEstimadas: z.number().int().nonnegative(),
  idmandante: z.number().int().positive().optional(),
  parametros: z.record(z.string(), z.unknown()).optional(),
  columnas: z.array(z.string()).optional(),
  filas: z.array(z.record(z.string(), z.unknown())).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const usuario = await requirePermission(req, PERMISO.REPORTE_READ);
    const body = CreateSchema.parse(await req.json());

    if (!body.filas?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debe enviar filas para generar el Excel async.',
        },
        { status: 400 },
      );
    }

    if (!requiereExportAsync(body.filasEstimadas)) {
      return NextResponse.json(
        {
          success: false,
          error: `Export async requiere ≥ ${EXPORT_ASYNC_ROW_THRESHOLD} filas estimadas (o use export sync).`,
        },
        { status: 400 },
      );
    }

    const job = await crearExportacionJob({
      idusuario: usuario.idusuario,
      tipo: body.tipo,
      filasEstimadas: body.filasEstimadas,
      idmandante: body.idmandante,
      parametros: body.parametros,
      columnas: body.columnas,
      filas: body.filas,
    });
    dispararProcesamientoExportaciones();

    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'Error al crear export';
    const status = mensaje.includes('No autenticado')
      ? 401
      : /permiso|Permiso/i.test(mensaje)
        ? 403
        : 400;
    return NextResponse.json({ success: false, error: mensaje }, { status });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const usuario = await requirePermission(req, PERMISO.REPORTE_READ);
    const idexport = Number(req.nextUrl.searchParams.get('idexport'));
    const download = req.nextUrl.searchParams.get('download') === '1';

    if (!Number.isFinite(idexport) || idexport < 1) {
      return NextResponse.json(
        { success: false, error: 'idexport inválido.' },
        { status: 400 },
      );
    }

    if (download) {
      const file = await obtenerRutaArchivoExport(idexport, usuario.idusuario);
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Archivo no disponible.' },
          { status: 404 },
        );
      }
      const buffer = await readFile(file.rutaAbsoluta);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${file.nombreArchivo}"`,
        },
      });
    }

    const job = await obtenerExportacionJob(idexport, usuario.idusuario);
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job no encontrado.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'Error al consultar export';
    const status = mensaje.includes('No autenticado') ? 401 : 400;
    return NextResponse.json({ success: false, error: mensaje }, { status });
  }
}
