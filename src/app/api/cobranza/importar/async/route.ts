import { NextResponse ,type  NextRequest } from 'next/server';

import { z } from 'zod';
import { requirePermission } from '@/lib/middleware/auth';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { crearImportacionJob, dispararProcesamientoImportaciones } from '@/lib/cobranza/import/importacion-job-service';
import type { TipoImportacionCobranza } from '@/lib/cobranza/import/import-orchestrator';
import {
  esExtensionImportacionValida,
  MAX_IMPORT_FILE_BYTES,
  mensajeArchivoExcedeLimite,
  mensajeFormatoImportacionNoSoportado,
} from '@/lib/cobranza/upload-limits';
import {
  parseIdempotencyKeyHeader,
  mensajeIdempotencyKeyInvalida,
} from '@/lib/api/idempotency-key';
import { handleApiError } from '@/lib/api/error-handler';

export const maxDuration = 60;

const AsyncImportSchema = z.object({
  tipo: z
    .enum(['CARTERA', 'GESTIONES', 'PAGOS', 'PROMESAS', 'CONTACTOS', 'COMPLETO'])
    .default('COMPLETO'),
  idmandante: z.coerce.number().int().positive(),
  idcampana: z.coerce.number().int().positive().optional(),
  fechaCorte: z.coerce.date().optional(),
  nombreHoja: z.string().optional(),
  idplantillaImp: z.coerce.number().int().positive().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const usuario = await requirePermission(req, PERMISO.CARTERA_WRITE);

    const rawIdem = req.headers.get('idempotency-key');
    let idempotencyKey: string | undefined;
    if (rawIdem != null && rawIdem.trim() !== '') {
      idempotencyKey = parseIdempotencyKeyHeader(rawIdem);
      if (!idempotencyKey) {
        return NextResponse.json(
          { success: false, error: mensajeIdempotencyKeyInvalida(), code: 'VALIDACION_ERROR' },
          { status: 400 },
        );
      }
    }

    const formData = await req.formData();
    const archivo = formData.get('archivo');

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Debe enviar un archivo.', code: 'VALIDACION_ERROR' },
        { status: 400 },
      );
    }

    if (archivo.size > MAX_IMPORT_FILE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: mensajeArchivoExcedeLimite(MAX_IMPORT_FILE_BYTES),
          code: 'VALIDACION_ERROR',
        },
        { status: 400 },
      );
    }

    if (!esExtensionImportacionValida(archivo.name)) {
      return NextResponse.json(
        {
          success: false,
          error: mensajeFormatoImportacionNoSoportado(),
          code: 'VALIDACION_ERROR',
        },
        { status: 400 },
      );
    }

    const parsed = AsyncImportSchema.safeParse({
      tipo: formData.get('tipo') ?? 'COMPLETO',
      idmandante: formData.get('idmandante'),
      idcampana: formData.get('idcampana') ?? undefined,
      fechaCorte: formData.get('fechaCorte') ?? undefined,
      nombreHoja: formData.get('nombreHoja') ?? undefined,
      idplantillaImp: formData.get('idplantillaImp') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Parámetros inválidos.', code: 'VALIDACION_ERROR' },
        { status: 400 },
      );
    }

    const { tipo, idmandante, idcampana, fechaCorte, nombreHoja, idplantillaImp } =
      parsed.data;

    if (
      (tipo === 'CARTERA' || tipo === 'COMPLETO') &&
      (!idcampana || !fechaCorte)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cartera y completo requieren campaña y fecha de corte.',
          code: 'VALIDACION_ERROR',
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const job = await crearImportacionJob({
      idmandante,
      idusuario: usuario.idusuario,
      tipo: tipo as TipoImportacionCobranza,
      nombreArchivo: archivo.name,
      buffer,
      idcampana,
      fechaCorte,
      nombreHoja,
      idplantillaImp,
      idempotencyKey,
    });

    dispararProcesamientoImportaciones(req.nextUrl.origin);

    return NextResponse.json({
      success: true,
      async: true,
      job,
      mensaje:
        'Importación encolada. Se procesará en segundo plano; consulte el estado del job.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
