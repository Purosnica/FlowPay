/** Transacciones de importación: filas con muchos contactos pueden superar 5 s. */
export const IMPORT_TRANSACTION_OPTIONS = {
  maxWait: 15_000,
  timeout: 120_000,
} as const;

export type ImportTransactionOptions = typeof IMPORT_TRANSACTION_OPTIONS;
