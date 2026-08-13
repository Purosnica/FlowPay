import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api/error-handler';

const MAX_FOTO_PERFIL_BYTES = 2 * 1024 * 1024;
const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

function coincideMagic(buffer: Buffer, firma: number[], offset = 0): boolean {
  return (
    buffer.length >= offset + firma.length &&
    firma.every((byte, index) => buffer[offset + index] === byte)
  );
}

function esFotoPerfilValida(buffer: Buffer, mime: string): boolean {
  switch (mime) {
    case 'image/jpeg':
      return coincideMagic(buffer, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return coincideMagic(buffer, [0x89, 0x50, 0x4e, 0x47]);
    case 'image/webp':
      return (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    default:
      return false;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const usuario = await requireAuth(req);
    const registro = await prisma.tbl_usuario.findUnique({
      where: { idusuario: usuario.idusuario },
      select: { fotoPerfilBlob: true, fotoPerfilMime: true },
    });
    if (!registro?.fotoPerfilBlob || !registro.fotoPerfilMime) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(new Uint8Array(registro.fotoPerfilBlob), {
      headers: {
        'Content-Type': registro.fotoPerfilMime,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const usuario = await requireAuth(req);
    const formData = await req.formData();
    const archivo = formData.get('foto');
    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Seleccione una imagen.' },
        { status: 400 }
      );
    }
    if (archivo.size === 0 || archivo.size > MAX_FOTO_PERFIL_BYTES) {
      return NextResponse.json(
        { success: false, error: 'La foto debe pesar como máximo 2 MB.' },
        { status: 400 }
      );
    }
    if (!MIME_PERMITIDOS.has(archivo.type)) {
      return NextResponse.json(
        { success: false, error: 'La foto debe ser JPG, PNG o WebP.' },
        { status: 400 }
      );
    }

    const fotoPerfilBlob = Buffer.from(await archivo.arrayBuffer());
    if (!esFotoPerfilValida(fotoPerfilBlob, archivo.type)) {
      return NextResponse.json(
        { success: false, error: 'El contenido no corresponde a una imagen válida.' },
        { status: 400 },
      );
    }

    const actualizado = await prisma.tbl_usuario.update({
      where: { idusuario: usuario.idusuario },
      data: { fotoPerfilBlob, fotoPerfilMime: archivo.type },
      select: { updatedAt: true },
    });

    return NextResponse.json({
      success: true,
      fotoPerfil: `/api/perfil/foto?v=${actualizado.updatedAt.getTime()}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
