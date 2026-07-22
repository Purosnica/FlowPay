'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  guardarColumnasVisibles,
  leerColumnasVisibles,
} from '@/lib/ux/ux-prefs';

/**
 * Persistencia de columnas visibles por reporte y usuario (I183).
 */
export function useReporteColumnas(
  idusuario: number | null,
  reporteId: string,
  allColumnIds: readonly string[],
) {
  const idsKey = allColumnIds.join('|');

  const [visibleIds, setVisibleIds] = useState<string[]>(() => [
    ...allColumnIds,
  ]);

  useEffect(() => {
    const defaults = idsKey ? idsKey.split('|') : [];
    if (idusuario == null) {
      setVisibleIds(defaults);
      return;
    }
    const saved = leerColumnasVisibles(idusuario, reporteId);
    if (saved && saved.length > 0) {
      const filtered = saved.filter((id) => defaults.includes(id));
      setVisibleIds(filtered.length > 0 ? filtered : defaults);
    } else {
      setVisibleIds(defaults);
    }
  }, [idusuario, reporteId, idsKey]);

  const toggle = useCallback(
    (columnId: string) => {
      setVisibleIds((prev) => {
        const next = prev.includes(columnId)
          ? prev.filter((id) => id !== columnId)
          : [...prev, columnId];
        const safe = next.length === 0 ? [columnId] : next;
        if (idusuario != null) {
          guardarColumnasVisibles(idusuario, reporteId, safe);
        }
        return safe;
      });
    },
    [idusuario, reporteId],
  );

  const reset = useCallback(() => {
    const defaults = idsKey ? idsKey.split('|') : [];
    setVisibleIds(defaults);
    if (idusuario != null) {
      guardarColumnasVisibles(idusuario, reporteId, defaults);
    }
  }, [idsKey, idusuario, reporteId]);

  const isVisible = useCallback(
    (columnId: string) => visibleIds.includes(columnId),
    [visibleIds],
  );

  return useMemo(
    () => ({ visibleIds, toggle, reset, isVisible }),
    [visibleIds, toggle, reset, isVisible],
  );
}
