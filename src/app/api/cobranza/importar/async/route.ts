import { NextResponse ,type  NextRequest } from 'next/server';

import { z } from 'zod';
import { requirePermission } from '@/lib/middleware/auth';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { crearImportacionJob, procesarImportacionesPendientes } from '@/lib/cobranza/import/importacion-job-service';
import type { TipoImportacionCobranza } from '@/lib/cobranza/import/import-orchestrator';
import {
  MAX_IMPORT_FILE_BYTES,
  mensajeArchivoExcedeLimite,
} from '@/lib/cobranza/upload-limits';
import { obtenerImportMaxJobsPerRun } from '@/lib/scalability/scalability-config';

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
    const formData = await req.formData();
    const archivo = formData.get('archivo');

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Debe enviar un archivo.' },
        { status: 400 },
      );
    }

    if (archivo.size > MAX_IMPORT_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: mensajeArchivoExcedeLimite(MAX_IMPORT_FILE_BYTES) },
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
        { success: false, error: 'Parámetros inválidos.' },
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
    });

    void procesarImportacionesPendientes(obtenerImportMaxJobsPerRun()).catch(
      () => undefined,
    );

    return NextResponse.json({
      success: true,
      async: true,
      job,
      mensaje:
        'Importación encolada. Se procesará en segundo plano; consulte el estado del job.',
    });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'Error al encolar importación';
    const status = mensaje.includes('No autenticado') ? 401 : 400;
    return NextResponse.json({ success: false, error: mensaje }, { status });
  }
}
