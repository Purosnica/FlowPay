/**
 * Almacenamiento y validación de archivos de documentos de cobranza.
 *
 * Multi-instancia (H29): defina FLOWPAY_STORAGE_ROOT en un volumen compartido.
 * Sin object storage externo en esta oleada (I003 diferido).
 */

import path from 'path';
import { mkdir, writeFile, readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { resolverStorageRoot } from '@/lib/cobranza/storage-root';

export const DOCUMENTOS_STORAGE_DIR = path.join(
  resolverStorageRoot(),
  'documentos',
  'cobranza',
);

export const MIME_A_EXTENSION: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
};

export const EXTENSION_A_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

const NOMBRE_SEGURO_RE = /^[a-zA-Z0-9._-]+$/;

export function esNombreArchivoDocumentoSeguro(nombre: string): boolean {
  return (
    NOMBRE_SEGURO_RE.test(nombre) &&
    !nombre.includes('..') &&
    nombre.length > 0 &&
    nombre.length <= 120
  );
}

export function rutaDocumentoStorage(nombre: string): string {
  if (!esNombreArchivoDocumentoSeguro(nombre)) {
    throw new Error('Nombre de archivo de documento inválido.');
  }
  const base = path.resolve(DOCUMENTOS_STORAGE_DIR);
  const full = path.resolve(base, nombre);
  const prefix = base.endsWith(path.sep) ? base : base + path.sep;
  if (full !== base && !full.startsWith(prefix)) {
    throw new Error('Ruta de documento fuera del directorio permitido.');
  }
  return full;
}

/** Ruta legacy en public (solo lectura de archivos antiguos). */
export function rutaDocumentoLegacyPublic(nombre: string): string {
  return path.join(process.cwd(), 'public', 'uploads', 'cobranza', nombre);
}

export function urlDocumentoApi(nombre: string): string {
  return `/api/cobranza/documentos/file/${nombre}`;
}

/**
 * Valida URL de documento: rutas internas de la app o https externo.
 */
export function esDocumentoUrlPermitida(url: string): boolean {
  if (esDocumentoUrlInterna(url)) {
    return true;
  }

  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Solo rutas servidas por la app (upload autenticado). */
export function esDocumentoUrlInterna(url: string): boolean {
  const trimmed = url.trim();
  if (
    trimmed.startsWith('/api/cobranza/documentos/file/') ||
    trimmed.startsWith('/uploads/cobranza/')
  ) {
    const nombre = trimmed.split('/').pop() ?? '';
    return esNombreArchivoDocumentoSeguro(nombre);
  }
  return false;
}

function coincideMagic(
  buffer: Buffer,
  firma: number[],
  offset = 0,
): boolean {
  if (buffer.length < offset + firma.length) {
    return false;
  }
  return firma.every((byte, i) => buffer[offset + i] === byte);
}

/**
 * Verifica magic bytes del contenido vs MIME declarado.
 */
export function validarMagicBytes(
  buffer: Buffer,
  mime: string,
): boolean {
  switch (mime) {
    case 'application/pdf':
      return buffer.subarray(0, 4).toString('ascii') === '%PDF';
    case 'image/jpeg':
      return coincideMagic(buffer, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return coincideMagic(buffer, [0x89, 0x50, 0x4e, 0x47]);
    case 'image/webp':
      return (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case 'audio/wav':
      return (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WAVE'
      );
    case 'audio/mpeg':
      return (
        buffer.subarray(0, 3).toString('ascii') === 'ID3' ||
        coincideMagic(buffer, [0xff, 0xfb]) ||
        coincideMagic(buffer, [0xff, 0xfa]) ||
        coincideMagic(buffer, [0xff, 0xf3]) ||
        coincideMagic(buffer, [0xff, 0xf2])
      );
    default:
      return false;
  }
}

export async function guardarDocumentoCobranza(
  buffer: Buffer,
  mime: string,
): Promise<{ nombre: string; url: string }> {
  const ext = MIME_A_EXTENSION[mime];
  if (!ext) {
    throw new Error('Tipo de archivo no permitido.');
  }
  if (!validarMagicBytes(buffer, mime)) {
    throw new Error(
      'El contenido del archivo no coincide con el tipo declarado.',
    );
  }

  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  await mkdir(DOCUMENTOS_STORAGE_DIR, { recursive: true });
  await writeFile(rutaDocumentoStorage(nombre), buffer);

  return { nombre, url: urlDocumentoApi(nombre) };
}

export async function leerDocumentoCobranza(
  nombre: string,
): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!esNombreArchivoDocumentoSeguro(nombre)) {
    return null;
  }

  const ext = path.extname(nombre).toLowerCase();
  const mime = EXTENSION_A_MIME[ext];
  if (!mime) {
    return null;
  }

  const primaria = rutaDocumentoStorage(nombre);
  try {
    await access(primaria, constants.R_OK);
    const buffer = await readFile(primaria);
    return { buffer, mime };
  } catch {
    // Fallback a archivos subidos antes del cambio de storage.
  }

  const legacy = rutaDocumentoLegacyPublic(nombre);
  try {
    await access(legacy, constants.R_OK);
    const buffer = await readFile(legacy);
    return { buffer, mime };
  } catch {
    return null;
  }
}
