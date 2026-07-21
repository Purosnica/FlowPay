import { NextResponse } from 'next/server';
import { buildLiveness } from '@/lib/health/health-service';

/** GET /api/health — liveness (sin DB). */
export async function GET() {
  return NextResponse.json(buildLiveness(), { status: 200 });
}
