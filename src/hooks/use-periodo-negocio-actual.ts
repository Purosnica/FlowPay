'use client';

import { useEffect, useState } from 'react';
import {
  periodoActual,
  rangoFechasMesActual,
} from '@/lib/cobranza/periodo-utils';

/** Evita fijar el mes al momento del prerender y diferencias de hidratación. */
export function useRangoFechasActual() {
  const [rango, setRango] = useState('');

  useEffect(() => {
    setRango(rangoFechasMesActual());
  }, []);

  return [rango, setRango] as const;
}

/** Variante mensual exclusiva para cierres contables de liquidaciones. */
export function usePeriodoMensualActual() {
  const [periodo, setPeriodo] = useState('');

  useEffect(() => {
    setPeriodo(periodoActual());
  }, []);

  return [periodo, setPeriodo] as const;
}
