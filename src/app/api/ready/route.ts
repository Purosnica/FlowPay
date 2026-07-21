import { NextResponse } from 'next/server';
import { checkReadiness } from '@/lib/health/health-service';

/** GET /api/ready — readiness (ping MySQL). */
export async function GET() {
  const result = await checkReadiness();
  const status = result.status === 'ready' ? 200 : 503;
  return NextResponse.json(result, { status });
}
