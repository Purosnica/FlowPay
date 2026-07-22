'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PrestamoFilters } from '@/types/cobranza';

const STORAGE_PREFIX = 'flowpay_cartera_filters';

function clave(idusuario: number): string {
  return `${STORAGE_PREFIX}.${idusuario}`;
}

function leerFiltros(idusuario: number | null): PrestamoFilters {
  if (typeof window === 'undefined' || idusuario == null) {
    return {};
  }
  try {
    const raw = localStorage.getItem(clave(idusuario));
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as PrestamoFilters;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Persiste filtros de cartera por usuario (I048).
 * Si `inicialDesdeUrl` trae claves, tiene prioridad sobre localStorage.
 */
export function useCarteraFiltersPersist(
  idusuario: number | null,
  inicialDesdeUrl: PrestamoFilters,
): {
  filters: PrestamoFilters;
  setFilters: (next: PrestamoFilters) => void;
  resetFilters: () => void;
  hidratado: boolean;
} {
  const [hidratado, setHidratado] = useState(false);
  const [filters, setFiltersState] = useState<PrestamoFilters>(inicialDesdeUrl);

  useEffect(() => {
    if (idusuario == null) {
      return;
    }
    const desdeUrl = Object.keys(inicialDesdeUrl).length > 0;
    setFiltersState(desdeUrl ? inicialDesdeUrl : leerFiltros(idusuario));
    setHidratado(true);
    // Solo hidratar al montar / cambio de usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inicialDesdeUrl se lee una vez
  }, [idusuario]);

  const setFilters = useCallback(
    (next: PrestamoFilters) => {
      setFiltersState(next);
      if (idusuario == null || typeof window === 'undefined') {
        return;
      }
      if (Object.keys(next).length === 0) {
        localStorage.removeItem(clave(idusuario));
        return;
      }
      localStorage.setItem(clave(idusuario), JSON.stringify(next));
    },
    [idusuario],
  );

  const resetFilters = useCallback(() => {
    setFilters({});
  }, [setFilters]);

  return { filters, setFilters, resetFilters, hidratado };
}
