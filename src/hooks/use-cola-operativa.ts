'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clampIndiceCola,
  moverIndiceCola,
  siguienteIdEnCola,
} from '@/lib/logic/cola-operativa-logic';

type CasoConId = { idprestamo: number };

/**
 * Estado compartido de cola operativa (selección + avance) para Mi día / Bandeja.
 * La selección es sticky por `idprestamo` para no saltar de cliente si la lista
 * se reordena tras un refetch.
 */
export function useColaOperativa<T extends CasoConId>(casos: readonly T[]) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const colaIds = useMemo(
    () => casos.map((c) => c.idprestamo),
    [casos],
  );

  useEffect(() => {
    if (casos.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev != null && colaIds.includes(prev)) {
        return prev;
      }
      return casos[0]?.idprestamo ?? null;
    });
  }, [casos, colaIds]);

  const selectedIndex = useMemo(() => {
    if (selectedId == null || casos.length === 0) {
      return 0;
    }
    const idx = colaIds.indexOf(selectedId);
    return idx >= 0 ? idx : 0;
  }, [casos.length, colaIds, selectedId]);

  const casoSeleccionado = casos[selectedIndex] ?? casos[0] ?? null;

  const setSelectedIndex = useCallback(
    (index: number) => {
      const nextIdx = clampIndiceCola(index, casos.length);
      setSelectedId(casos[nextIdx]?.idprestamo ?? null);
    },
    [casos],
  );

  const seleccionarPorId = useCallback((idprestamo: number) => {
    setSelectedId(idprestamo);
  }, []);

  const mover = useCallback(
    (delta: number) => {
      setSelectedId((prev) => {
        const prevIdx =
          prev != null ? colaIds.indexOf(prev) : selectedIndex;
        const base = prevIdx >= 0 ? prevIdx : 0;
        const nextIdx = moverIndiceCola(base, casos.length, delta);
        return casos[nextIdx]?.idprestamo ?? null;
      });
    },
    [casos, colaIds, selectedIndex],
  );

  /**
   * Avanza al siguiente id tras una acción.
   * Retorna el siguiente caso o null si la cola terminó.
   */
  const avanzarTrasId = useCallback(
    (idActual: number): T | null => {
      const nextId = siguienteIdEnCola(colaIds, idActual);
      if (nextId == null) {
        return null;
      }
      setSelectedId(nextId);
      return casos.find((c) => c.idprestamo === nextId) ?? null;
    },
    [casos, colaIds],
  );

  return {
    selectedIndex,
    setSelectedIndex,
    casoSeleccionado,
    colaIds,
    seleccionarPorId,
    mover,
    avanzarTrasId,
  };
}
