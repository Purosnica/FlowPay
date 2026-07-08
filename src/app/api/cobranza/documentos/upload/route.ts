import { NextResponse ,type  NextRequest } from 'next/server';

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requirePermission } from '@/lib/middleware/auth';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  MAX_DOCUMENTO_FILE_BYTES,
  mensajeArchivoExcedeLimite,
} from '@/lib/cobranza/upload-limits';

const MIME_PERMITIDOS = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await requirePermission(req, PERMISO.CARTERA_WRITE);
    const formData = await req.formData();
    const archivo = formData.get('archivo');

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Archivo requerido.' },
        { status: 400 },
      );
    }
    if (archivo.size > MAX_DOCUMENTO_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: mensajeArchivoExcedeLimite(MAX_DOCUMENTO_FILE_BYTES) },
        { status: 400 },
      );
    }
    if (!MIME_PERMITIDOS.has(archivo.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de archivo no permitido.' },
        { status: 400 },
      );
    }

    const ext = path.extname(archivo.name) || '.bin';
    const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const dir = path.join(process.cwd(), 'public', 'uploads', 'cobranza');
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await archivo.arrayBuffer());
    await writeFile(path.join(dir, nombre), buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/cobranza/${nombre}`,
    });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'Error al subir archivo.';
    const status = mensaje.includes('No autenticado') ? 401 : 500;
    return NextResponse.json({ success: false, error: mensaje }, { status });
  }
}
