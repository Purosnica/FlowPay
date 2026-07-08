import { NextResponse } from 'next/server';
import { validarCronAuth } from '@/lib/cron/cron-auth';
import { ejecutarCronOperacionesCobranza } from '@/lib/cron/cron-orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request): Promise<NextResponse> {
  if (!validarCronAuth(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const resultado = await ejecutarCronOperacionesCobranza('cron');
    const status = resultado.estado === 'ERROR' ? 500 : 200;

    return NextResponse.json(
      {
        ok: resultado.estado === 'OK' || resultado.estado === 'PARCIAL',
        ...resultado,
      },
      { status },
    );
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error en cron';
    return NextResponse.json(
      { ok: false, error: mensaje },
      { status: 500 },
    );
  }
}
