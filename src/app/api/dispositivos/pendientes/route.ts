import { NextResponse, type NextRequest } from 'next/server';
import { validarSmsGatewayAuth } from '@/lib/sms/sms-gateway-auth';
import { claimSmsPendientes } from '@/lib/sms/sms-gateway-service';
import { handleApiError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

async function responderPendientes(
  req: NextRequest,
): Promise<NextResponse> {
  if (!validarSmsGatewayAuth(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const dispositivoIdRaw = req.nextUrl.searchParams.get('dispositivo_id');
    const result = await claimSmsPendientes({ dispositivoIdRaw });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return responderPendientes(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Body de telemetría (bateria/senal) opcional; no se persiste aún.
  try {
    await req.json();
  } catch {
    // GET fallback / body vacío: ok
  }
  return responderPendientes(req);
}
