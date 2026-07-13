/**
 * Límites centralizados de carga de archivos.
 */

export const MAX_IMPORT_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_DOCUMENTO_FILE_BYTES = 5 * 1024 * 1024;

export const EXTENSIONES_IMPORTACION = [
  'xlsx',
  'xls',
  'xlsm',
  'xlsb',
  'csv',
] as const;

export type ExtensionImportacion = (typeof EXTENSIONES_IMPORTACION)[number];

export const ACCEPT_IMPORTACION = EXTENSIONES_IMPORTACION.map(
  (ext) => `.${ext}`,
).join(',');

export function esExtensionImportacionValida(
  nombreArchivo: string,
): nombreArchivo is `${string}.${ExtensionImportacion}` {
  const extension = nombreArchivo.split('.').pop()?.toLowerCase();
  return (
    !!extension &&
    (EXTENSIONES_IMPORTACION as readonly string[]).includes(extension)
  );
}

export function mensajeFormatoImportacionNoSoportado(): string {
  return `Formato no soportado. Use ${EXTENSIONES_IMPORTACION.map((e) => `.${e}`).join(', ')}`;
}

export function mensajeArchivoExcedeLimite(maxBytes: number): string {
  const mb = Math.round(maxBytes / (1024 * 1024));
  return `Archivo excede ${mb} MB.`;
}
