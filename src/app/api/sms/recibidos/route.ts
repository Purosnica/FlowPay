import { NextResponse, type NextRequest } from 'next/server';
import { validarSmsGatewayAuth } from '@/lib/sms/sms-gateway-auth';
import {
  registrarSmsRecibido,
  SmsRecibidoSchema,
} from '@/lib/sms/sms-gateway-service';
import { handleApiError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!validarSmsGatewayAuth(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body: unknown = await req.json();
    const parsed = SmsRecibidoSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: first?.message ?? 'Datos de entrada inválidos' },
        { status: 400 },
      );
    }

    const result = await registrarSmsRecibido(parsed.data);
    return NextResponse.json({ ok: true, idrecibido: result.idrecibido });
  } catch (error) {
    return handleApiError(error);
  }
}
