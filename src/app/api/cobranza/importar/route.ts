import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/middleware/auth';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  importarCobranza,
  type TipoImportacionCobranza,
} from '@/lib/cobranza/import/import-orchestrator';
import { previsualizarImportacionCartera } from '@/lib/cobranza/import/cartera-preview-service';
import { registrarAuditoria } from '@/lib/cobranza/auditoria-service';
import { prisma } from '@/lib/prisma';
import {
  esExtensionImportacionValida,
  MAX_IMPORT_FILE_BYTES,
  mensajeArchivoExcedeLimite,
  mensajeFormatoImportacionNoSoportado,
} from '@/lib/cobranza/upload-limits';
import {
  crearImportacionJob,
  dispararProcesamientoImportaciones,
} from '@/lib/cobranza/import/importacion-job-service';
import {
  parseIdempotencyKeyHeader,
  mensajeIdempotencyKeyInvalida,
} from '@/lib/api/idempotency-key';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * I115: el path sync solo admite preview o forceSync=1.
 * Importaciones reales se delegan al job async (evita xlsx CPU-bound en request).
 */
export const maxDuration = 300;

const TIPOS: TipoImportacionCobranza[] = [
  'CARTERA',
  'GESTIONES',
  'PAGOS',
  'PROMESAS',
  'CONTACTOS',
  'COMPLETO',
];

const ImportFormSchema = z.object({
  tipo: z
    .enum([
      'CARTERA',
      'GESTIONES',
      'PAGOS',
      'PROMESAS',
      'CONTACTOS',
      'COMPLETO',
    ])
    .default('CARTERA'),
  idmandante: z.coerce.number().int().positive(),
  idcampana: z.coerce.number().int().positive().optional(),
  fechaCorte: z.coerce.date().optional(),
  nombreHoja: z.string().optional(),
  idplantillaImp: z.coerce.number().int().positive().optional(),
  preview: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  forceSync: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
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
          {
            success: false,
            error: mensajeIdempotencyKeyInvalida(),
            code: 'VALIDACION_ERROR',
          },
          { status: 400 },
        );
      }
    }

    const formData = await req.formData();
    const archivo = formData.get('archivo');

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debe enviar un archivo Excel o CSV.',
          code: 'VALIDACION_ERROR',
        },
        { status: 400 },
      );
    }

    if (archivo.size > MAX_IMPORT_FILE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: mensajeArchivoExcedeLimite(MAX_IMPORT_FILE_BYTES),
        },
        { status: 400 },
      );
    }

    if (!esExtensionImportacionValida(archivo.name)) {
      return NextResponse.json(
        {
          success: false,
          error: mensajeFormatoImportacionNoSoportado(),
        },
        { status: 400 },
      );
    }

    const parsed = ImportFormSchema.safeParse({
      tipo: formData.get('tipo') ?? 'CARTERA',
      idmandante: formData.get('idmandante'),
      idcampana: formData.get('idcampana') ?? undefined,
      fechaCorte: formData.get('fechaCorte') ?? undefined,
      nombreHoja: formData.get('nombreHoja') ?? undefined,
      idplantillaImp: formData.get('idplantillaImp') ?? undefined,
      preview: formData.get('preview') ?? undefined,
      forceSync: formData.get('forceSync') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Parámetros de importación inválidos.' },
        { status: 400 },
      );
    }

    const {
      tipo,
      idmandante,
      idcampana,
      fechaCorte,
      nombreHoja,
      idplantillaImp,
      preview,
      forceSync,
    } = parsed.data;

    if (!TIPOS.includes(tipo)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de importación inválido.' },
        { status: 400 },
      );
    }

    if (
      (tipo === 'CARTERA' || tipo === 'COMPLETO') &&
      (!idcampana || !fechaCorte)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cartera y completo requieren campaña y fecha de corte.',
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await archivo.arrayBuffer());

    if (preview && (tipo === 'CARTERA' || tipo === 'COMPLETO')) {
      if (!idcampana || !fechaCorte) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cartera y completo requieren campaña y fecha de corte.',
          },
          { status: 400 },
        );
      }
      const vistaPrevia = await previsualizarImportacionCartera({
        idmandante,
        idcampana,
        fechaCorte,
        idusuario: usuario.idusuario,
        buffer,
        nombreArchivo: archivo.name,
        nombreHoja: nombreHoja ?? 'data',
        idplantillaImp,
      });
      return NextResponse.json({
        success: true,
        preview: true,
        data: vistaPrevia,
      });
    }

    // I115: delegar a job async salvo forceSync explícito.
    if (!forceSync) {
      const job = await crearImportacionJob({
        idmandante,
        idusuario: usuario.idusuario,
        tipo,
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
        data: job,
        message:
          'Importación encolada. Use /api/cobranza/importar/async o consulte el job.',
      });
    }

    const resultado = await importarCobranza({
      tipo,
      idusuario: usuario.idusuario,
      idmandante,
      idcampana,
      fechaCorte,
      buffer,
      nombreArchivo: archivo.name,
      nombreHoja,
      idplantillaImp,
    });

    try {
      const detalle = JSON.stringify({
        archivo: archivo.name,
        idcampana,
        resultado,
      });
      await registrarAuditoria(prisma, {
        idusuario: usuario.idusuario,
        entidad: 'importacion_cobranza',
        entidadId: idmandante,
        accion: tipo,
        detalle: detalle.slice(0, 3500),
      });
    } catch (auditError) {
      const mensajeAudit =
        auditError instanceof Error ? auditError.message : 'Error de auditoría';
      resultado.advertencias = [
        ...(resultado.advertencias ?? []),
        `Importación completada, pero no se registró auditoría: ${mensajeAudit}`,
      ];
    }

    return NextResponse.json({ success: true, data: resultado });
  } catch (error) {
    return handleApiError(error);
  }
}
