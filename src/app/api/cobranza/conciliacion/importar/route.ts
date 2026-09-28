import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/middleware/auth';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { handleApiError } from '@/lib/api/error-handler';
import {
  esExtensionImportacionValida,
  MAX_IMPORT_FILE_BYTES,
  mensajeArchivoExcedeLimite,
  mensajeFormatoImportacionNoSoportado,
} from '@/lib/cobranza/upload-limits';
import { parsearExtractoBancario } from '@/lib/cobranza/conciliacion-extracto-parser';
import { crearExtractoBancario } from '@/lib/cobranza/conciliacion-bancaria-service';

export const maxDuration = 120;

const FormSchema = z.object({
  idmandante: z.coerce.number().int().positive(),
  institucionFinanciera: z.string().trim().min(2).max(120),
  cuenta: z.string().trim().min(2).max(120),
  moneda: z.enum(['NIO', 'USD']),
  nombreHoja: z.string().trim().max(120).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const usuario = await requirePermission(req, PERMISO.CONCILIACION_EXECUTE);
    const formData = await req.formData();
    const archivo = formData.get('archivo');

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Debe enviar un archivo Excel o CSV.' },
        { status: 400 },
      );
    }
    if (archivo.size > MAX_IMPORT_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: mensajeArchivoExcedeLimite(MAX_IMPORT_FILE_BYTES) },
        { status: 400 },
      );
    }
    if (!esExtensionImportacionValida(archivo.name)) {
      return NextResponse.json(
        { success: false, error: mensajeFormatoImportacionNoSoportado() },
        { status: 400 },
      );
    }

    const parsed = FormSchema.safeParse({
      idmandante: formData.get('idmandante'),
      institucionFinanciera: formData.get('institucionFinanciera'),
      cuenta: formData.get('cuenta'),
      moneda: formData.get('moneda'),
      nombreHoja: formData.get('nombreHoja') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Parámetros del extracto inválidos.' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const archivoHash = createHash('sha256').update(buffer).digest('hex');
    const resultado = parsearExtractoBancario(buffer, {
      nombreHoja: parsed.data.nombreHoja,
      monedaDefault: parsed.data.moneda,
    });

    if (resultado.errores.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'El extracto contiene errores de validación.',
          errores: resultado.errores.slice(0, 200),
          totalErrores: resultado.errores.length,
        },
        { status: 400 },
      );
    }

    const fechas = resultado.lineas.map((l) => l.fechaOperacion.getTime());
    const extracto = await crearExtractoBancario(usuario.idusuario, {
      idmandante: parsed.data.idmandante,
      institucionFinanciera: parsed.data.institucionFinanciera,
      cuenta: parsed.data.cuenta,
      moneda: parsed.data.moneda,
      fechaDesde: new Date(Math.min(...fechas)),
      fechaHasta: new Date(Math.max(...fechas)),
      archivoNombre: archivo.name,
      archivoHash,
      lineas: resultado.lineas,
    });

    return NextResponse.json({
      success: true,
      data: {
        idextracto: extracto.idextracto,
        archivoHash,
        totalLineas: resultado.lineas.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
