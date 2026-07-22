/**
 * Política de almacenamiento de payloads de importación async.
 * En Vercel /tmp no se comparte entre instancias → usar BD (o Blob).
 */

export type ImportFileStorageMode = 'db' | 'fs';

/** True en runtime serverless de Vercel. */
export function esRuntimeVercel(): boolean {
  return process.env.VERCEL === '1';
}

/** Subconjunto de env usado para decidir el backend de imports. */
export type ImportFileStorageEnv = {
  VERCEL?: string;
  FLOWPAY_IMPORT_STORAGE?: string;
};

/**
 * Modo de escritura del archivo de importación.
 * - db: payload en columna Bytes (multi-instancia / Vercel)
 * - fs: disco local (self-host con volumen o single-instance)
 */
export function resolverImportFileStorageMode(
  env: ImportFileStorageEnv = process.env,
): ImportFileStorageMode {
  if (env.VERCEL === '1') {
    return 'db';
  }
  if (env.FLOWPAY_IMPORT_STORAGE?.trim().toLowerCase() === 'db') {
    return 'db';
  }
  return 'fs';
}

/** Tras estado final estable, liberar LONGBLOB para no inflar la BD. */
export function debeLiberarContenidoArchivo(estado: string): boolean {
  return estado === 'COMPLETADO' || estado === 'ERROR';
}

/** Prefijo de ruta cuando el payload vive solo en BD. */
export const IMPORT_RUTA_DB_PREFIX = 'db:';

export function esRutaImportacionDb(rutaArchivo: string): boolean {
  return rutaArchivo.startsWith(IMPORT_RUTA_DB_PREFIX);
}

export function construirRutaImportacionDb(idjob: number): string {
  return `${IMPORT_RUTA_DB_PREFIX}${idjob}`;
}
