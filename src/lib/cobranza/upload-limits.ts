/**
 * Límites centralizados de carga de archivos.
 */

export const MAX_IMPORT_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_DOCUMENTO_FILE_BYTES = 5 * 1024 * 1024;

export function mensajeArchivoExcedeLimite(maxBytes: number): string {
  const mb = Math.round(maxBytes / (1024 * 1024));
  return `Archivo excede ${mb} MB.`;
}
