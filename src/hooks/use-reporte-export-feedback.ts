'use client';

import { useCallback, useState } from 'react';

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
        action();
        setExportOk(successMessage);
      } catch {
        setExportError('No se pudo exportar el reporte.');
      }
    },
    [clearFeedback],
  );

  return {
    exportOk,
    exportError,
    clearFeedback,
    runExport,
  };
}
