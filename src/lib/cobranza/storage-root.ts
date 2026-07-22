/**
 * Raíz de almacenamiento local (H29).
 * Multi-instancia: montar volumen compartido en FLOWPAY_STORAGE_ROOT.
 * En Vercel no use disco para imports async: el payload va a BD
 * (ver import-file-storage-logic / import-file-store).
 */

import os from 'os';
import path from 'path';

export function resolverStorageRoot(): string {
  const configured = process.env.FLOWPAY_STORAGE_ROOT?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.join(os.tmpdir(), 'flowpay-storage');
}
