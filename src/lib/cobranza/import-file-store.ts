/**
 * Lectura/escritura del archivo de un job de importación.
 * Vercel: payload en BD. Self-host: disco bajo FLOWPAY_STORAGE_ROOT.
 */

import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  construirRutaImportacionDb,
  esRutaImportacionDb,
  resolverImportFileStorageMode,
} from '@/lib/logic/import-file-storage-logic';
import { resolverStorageRoot } from '@/lib/cobranza/storage-root';

const IMPORTS_DIR = path.join(resolverStorageRoot(), 'imports');

export function sanitizarNombreArchivoImport(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function rutaAbsolutaImportFs(rutaRelativa: string): string {
  return path.join(IMPORTS_DIR, rutaRelativa);
}

export async function asegurarDirImports(): Promise<void> {
  await mkdir(IMPORTS_DIR, { recursive: true });
}

export interface GuardarImportArchivoResult {
  rutaArchivo: string;
  /** Payload a persistir en BD (siempre en modo db; null en modo fs). */
  contenidoArchivo: Uint8Array<ArrayBuffer> | null;
}

/** Copia Buffer → Uint8Array con ArrayBuffer propio (Prisma Bytes). */
export function bufferToPrismaBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(buf.length);
  out.set(buf);
  return out;
}

/**
 * Persiste el buffer según el modo de storage del entorno.
 */
export async function guardarArchivoImportacion(input: {
  idjob: number;
  nombreArchivo: string;
  buffer: Buffer;
}): Promise<GuardarImportArchivoResult> {
  const mode = resolverImportFileStorageMode();
  const nombreSeguro = sanitizarNombreArchivoImport(input.nombreArchivo);
  const rutaRelativa = path.join(String(input.idjob), nombreSeguro);

  if (mode === 'db') {
    return {
      rutaArchivo: construirRutaImportacionDb(input.idjob),
      contenidoArchivo: bufferToPrismaBytes(input.buffer),
    };
  }

  await asegurarDirImports();
  const rutaAbsoluta = rutaAbsolutaImportFs(rutaRelativa);
  await mkdir(path.dirname(rutaAbsoluta), { recursive: true });
  await writeFile(rutaAbsoluta, input.buffer);

  return {
    rutaArchivo: rutaRelativa,
    contenidoArchivo: null,
  };
}

/**
 * Lee el payload del job (BD primero; fallback a disco para jobs legacy).
 */
export async function leerArchivoImportacion(input: {
  rutaArchivo: string;
  contenidoArchivo: Uint8Array | Buffer | null;
}): Promise<Buffer> {
  if (input.contenidoArchivo && input.contenidoArchivo.length > 0) {
    return Buffer.from(input.contenidoArchivo);
  }

  if (esRutaImportacionDb(input.rutaArchivo)) {
    throw new Error(
      'El archivo de importación no está disponible en almacenamiento ' +
        'persistente. Vuelva a subir el archivo.',
    );
  }

  return readFile(rutaAbsolutaImportFs(input.rutaArchivo));
}

/** Elimina archivo en disco si aplica (best-effort). */
export async function eliminarArchivoImportacionFs(
  rutaArchivo: string,
): Promise<void> {
  if (!rutaArchivo || esRutaImportacionDb(rutaArchivo)) {
    return;
  }
  try {
    await unlink(rutaAbsolutaImportFs(rutaArchivo));
  } catch {
    // Archivo ya ausente o sin permiso — no bloquear el job.
  }
}
