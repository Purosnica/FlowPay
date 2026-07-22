'use client';

import { useCallback, useState } from 'react';
import { csrfHeaders } from '@/lib/security/csrf';
import {
  EXPORT_ASYNC_ROW_THRESHOLD,
} from '@/lib/cobranza/performance-limits';

export function useReporteExportFeedback() {
  const [exportOk, setExportOk] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const clearFeedback = useCallback((): void => {
    setExportOk(null);
    setExportError(null);
  }, []);

  const runExport = useCallback(
    (action: () => void, successMessage = 'Archivo Excel descargado.'): void => {
      clearFeedback();
      try {
        // I115: cede el hilo antes del trabajo CPU-bound de xlsx en cliente.
        setTimeout(() => {
          try {
            action();
            setExportOk(successMessage);
          } catch {
            setExportError('No se pudo exportar el reporte.');
          }
        }, 0);
      } catch {
        setExportError('No se pudo exportar el reporte.');
      }
    },
    [clearFeedback],
  );

  /**
   * I113: si filasEstimadas ≥ umbral, encola export async en servidor.
   */
  const runExportAsyncIfNeeded = useCallback(
    async (opts: {
      tipo: string;
      filasEstimadas: number;
      idmandante?: number;
      columnas?: string[];
      filas?: Array<Record<string, unknown>>;
      syncFallback: () => void;
    }): Promise<void> => {
      clearFeedback();
      if (opts.filasEstimadas < EXPORT_ASYNC_ROW_THRESHOLD) {
        runExport(opts.syncFallback);
        return;
      }

      try {
        const res = await fetch('/api/cobranza/exportar/async', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...csrfHeaders(),
          },
          body: JSON.stringify({
            tipo: opts.tipo,
            filasEstimadas: opts.filasEstimadas,
            idmandante: opts.idmandante,
            columnas: opts.columnas,
            filas: opts.filas,
          }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          error?: string;
          data?: { idexport: number };
        };
        if (!res.ok || !json.success || !json.data?.idexport) {
          setExportError(json.error ?? 'No se pudo encolar la exportación.');
          return;
        }
        setExportOk(
          `Exportación encolada (#${json.data.idexport}). Se procesará en background.`,
        );
      } catch {
        setExportError('No se pudo encolar la exportación.');
      }
    },
    [clearFeedback, runExport],
  );

  return {
    exportOk,
    exportError,
    clearFeedback,
    runExport,
    runExportAsyncIfNeeded,
  };
}
