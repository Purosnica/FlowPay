import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/middleware/auth';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { handleApiError } from '@/lib/api/error-handler';
import {
  ejecutarBajaMasivaMandante,
  listarLotesBaja,
  obtenerLoteBaja,
  reactivarPtmOsBajaMandante,
  revertirBajaMasivaMandante,
  validarBajaMasivaMandante,
} from '@/lib/cobranza/baja-mandante-service';
import {
  esExtensionImportacionValida,
  MAX_IMPORT_FILE_BYTES,
  mensajeArchivoExcedeLimite,
} from '@/lib/cobranza/upload-limits';

export const maxDuration = 300;

const EjecutarSchema = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('ejecutar'), idlote: z.number().int().positive() }),
  z.object({ accion: z.literal('revertir'), idlote: z.number().int().positive(), motivo: z.string().trim().min(5).max(500) }),
  z.object({
    accion: z.literal('reactivar_ptmos'),
    idlote: z.number().int().positive(),
    iddetalles: z.array(z.number().int().positive()).min(1).max(500),
    motivo: z.string().trim().min(5).max(500),
  }),
]);

export async function GET(req: NextRequest) {
  try {
    const usuario = await requirePermission(req, PERMISO.BAJA_MANDANTE_EXECUTE);
    const idlote = Number(req.nextUrl.searchParams.get('idlote'));
    if (Number.isInteger(idlote) && idlote > 0) {
      return NextResponse.json({ success: true, data: await obtenerLoteBaja(idlote, usuario.idusuario) });
    }
    const idmandante = Number(req.nextUrl.searchParams.get('idmandante'));
    if (!Number.isInteger(idmandante) || idmandante <= 0) {
      return NextResponse.json({ success: false, error: 'Mandante inválido.' }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: await listarLotesBaja(usuario.idusuario, idmandante) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const usuario = await requirePermission(req, PERMISO.BAJA_MANDANTE_EXECUTE);
    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const archivo = form.get('archivo');
      if (!(archivo instanceof File)) {
        return NextResponse.json({ success: false, error: 'Debe seleccionar un archivo Excel o CSV.' }, { status: 400 });
      }
      if (archivo.size > MAX_IMPORT_FILE_BYTES) {
        return NextResponse.json({ success: false, error: mensajeArchivoExcedeLimite(MAX_IMPORT_FILE_BYTES) }, { status: 400 });
      }
      if (!esExtensionImportacionValida(archivo.name)) {
        return NextResponse.json({ success: false, error: 'Use un archivo .xlsx o .csv.' }, { status: 400 });
      }
      const idmandante = Number(form.get('idmandante'));
      const idcampanaRaw = form.get('idcampana');
      const fechaEfectiva = new Date(String(form.get('fechaEfectiva') ?? ''));
      if (!Number.isInteger(idmandante) || idmandante <= 0 || Number.isNaN(fechaEfectiva.getTime())) {
        return NextResponse.json({ success: false, error: 'Mandante o fecha efectiva inválidos.' }, { status: 400 });
      }
      const data = await validarBajaMasivaMandante({
        idmandante,
        idcampana: idcampanaRaw ? Number(idcampanaRaw) : null,
        idusuario: usuario.idusuario,
        motivo: String(form.get('motivo') ?? ''),
        fechaEfectiva,
        observaciones: String(form.get('observaciones') ?? '') || null,
        referenciaMandante: String(form.get('referenciaMandante') ?? '') || null,
        nombreArchivo: archivo.name,
        buffer: Buffer.from(await archivo.arrayBuffer()),
        idempotencyKey: req.headers.get('idempotency-key'),
      });
      return NextResponse.json({ success: true, preview: true, data });
    }

    const body = EjecutarSchema.parse(await req.json());
    const data = body.accion === 'ejecutar'
      ? await ejecutarBajaMasivaMandante(body.idlote, usuario.idusuario)
      : body.accion === 'revertir'
        ? await revertirBajaMasivaMandante(body.idlote, usuario.idusuario, body.motivo)
        : await reactivarPtmOsBajaMandante(body.idlote, body.iddetalles, usuario.idusuario, body.motivo);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error);
  }
}
