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
 */
export function useColaOperativa<T extends CasoConId>(casos: readonly T[]) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const colaIds = useMemo(
    () => casos.map((c) => c.idprestamo),
    [casos],
  );

  useEffect(() => {
    setSelectedIndex((prev) => clampIndiceCola(prev, casos.length));
  }, [casos.length]);

  const casoSeleccionado = casos[selectedIndex] ?? casos[0] ?? null;

  const seleccionarPorId = useCallback(
    (idprestamo: number) => {
      const idx = colaIds.indexOf(idprestamo);
      if (idx >= 0) {
        setSelectedIndex(idx);
      }
    },
    [colaIds],
  );

  const mover = useCallback(
    (delta: number) => {
      setSelectedIndex((i) => moverIndiceCola(i, casos.length, delta));
    },
    [casos.length],
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
      const nextIdx = colaIds.indexOf(nextId);
      if (nextIdx >= 0) {
        setSelectedIndex(nextIdx);
      }
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
