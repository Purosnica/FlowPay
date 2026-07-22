import { NextResponse, type NextRequest } from 'next/server';
import { validarSmsGatewayAuth } from '@/lib/sms/sms-gateway-auth';
import {
  actualizarSmsStatus,
  SmsStatusSchema,
} from '@/lib/sms/sms-gateway-service';
import { handleApiError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest): Promise<NextResponse> {
  if (!validarSmsGatewayAuth(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body: unknown = await req.json();
    const parsed = SmsStatusSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: first?.message ?? 'Datos de entrada inválidos' },
        { status: 400 },
      );
    }

    await actualizarSmsStatus(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
