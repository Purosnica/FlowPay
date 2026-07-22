import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '@/lib/utils/logger';

/**
 * Sirve OpenAPI 3 (YAML) como texto; clientes pueden parsear.
 * Spec canónica: docs/openapi.yaml
 */
export async function GET(): Promise<NextResponse> {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'openapi.yaml');
    const yaml = await readFile(filePath, 'utf8');
    return new NextResponse(yaml, {
      status: 200,
      headers: {
        'Content-Type': 'application/yaml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    logger.error(
      'No se pudo leer openapi.yaml',
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      {
        success: false,
        error: 'OpenAPI no disponible',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}
