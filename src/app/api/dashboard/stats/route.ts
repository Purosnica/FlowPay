import { NextResponse, type NextRequest } from 'next/server';
import { validarSmsGatewayAuth } from '@/lib/sms/sms-gateway-auth';
import { obtenerSmsDashboardStats } from '@/lib/sms/sms-gateway-service';
import { handleApiError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!validarSmsGatewayAuth(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const stats = await obtenerSmsDashboardStats();
    return NextResponse.json({
      pendientes: stats.pendientes,
      enviando: stats.enviando,
      campana_nombre: stats.campana_nombre,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
