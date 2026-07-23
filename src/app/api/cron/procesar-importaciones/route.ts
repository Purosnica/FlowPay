import { NextResponse } from 'next/server';
import { validarCronAuth } from '@/lib/cron/cron-auth';
import { procesarImportacionesPendientes } from '@/lib/cobranza/import/importacion-job-service';
import { obtenerImportMaxJobsPerRun } from '@/lib/scalability/scalability-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request): Promise<NextResponse> {
  if (!validarCronAuth(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const resultado = await procesarImportacionesPendientes(
      obtenerImportMaxJobsPerRun(),
    );
    return NextResponse.json({ ok: true, ...resultado });
  } catch {
    return NextResponse.json({ ok: false, error: 'cron_import_failed' }, { status: 500 });
  }
}
