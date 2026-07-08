import { NextResponse ,type  NextRequest } from 'next/server';

import { requirePermission } from '@/lib/middleware/auth';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { obtenerImportacionJob } from '@/lib/cobranza/import/importacion-job-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  req: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  try {
    const usuario = await requirePermission(req, PERMISO.CARTERA_READ);
    const { id } = await context.params;
    const idjob = Number(id);
    if (!Number.isFinite(idjob)) {
      return NextResponse.json(
        { success: false, error: 'ID de job inválido.' },
        { status: 400 },
      );
    }

    const job = await obtenerImportacionJob(idjob, usuario.idusuario);
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job no encontrado.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, job });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'Error al consultar job';
    const status = mensaje.includes('No autenticado') ? 401 : 400;
    return NextResponse.json({ success: false, error: mensaje }, { status });
  }
}
