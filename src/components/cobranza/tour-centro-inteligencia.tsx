'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  PASOS_TOUR_CENTRO_INTELIGENCIA,
  STORAGE_TOUR_CI,
} from '@/lib/ux/tour-centro-inteligencia';
import { trackTourStep } from '@/lib/analytics/product-analytics';

interface TourCentroInteligenciaProps {
  idusuario: number | null;
}

interface TourState {
  omitido: boolean;
  completado: boolean;
  paso: number;
}

const ESTADO_INICIAL: TourState = {
  omitido: false,
  completado: false,
  paso: 0,
};

function clave(idusuario: number): string {
  return `${STORAGE_TOUR_CI}_${idusuario}`;
}

function cargar(idusuario: number | null): TourState {
  if (typeof window === 'undefined' || idusuario == null) {
    return ESTADO_INICIAL;
  }
  try {
    const raw = localStorage.getItem(clave(idusuario));
    if (!raw) {
      return ESTADO_INICIAL;
    }
    return { ...ESTADO_INICIAL, ...(JSON.parse(raw) as TourState) };
  } catch {
    return ESTADO_INICIAL;
  }
}

function guardar(idusuario: number, state: TourState): void {
  localStorage.setItem(clave(idusuario), JSON.stringify(state));
}

/**
 * Tour ligero del Centro de Inteligencia (I179).
 */
export function TourCentroInteligencia({
  idusuario,
}: TourCentroInteligenciaProps) {
  const [state, setState] = useState<TourState>(ESTADO_INICIAL);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(cargar(idusuario));
    setHydrated(true);
  }, [idusuario]);

  const persist = useCallback(
    (next: TourState) => {
      setState(next);
      if (idusuario != null) {
        guardar(idusuario, next);
      }
    },
    [idusuario],
  );

  const visible =
    hydrated &&
    idusuario != null &&
    !state.omitido &&
    !state.completado;

  const pasoActual = PASOS_TOUR_CENTRO_INTELIGENCIA[state.paso];

  useEffect(() => {
    if (!visible || !pasoActual) {
      return;
    }
    trackTourStep(pasoActual.id);
    const el = document.querySelector(`[data-tour-id="${pasoActual.ancla}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      return () => {
        el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      };
    }
    return undefined;
  }, [visible, pasoActual]);

  if (!visible || !pasoActual) {
    return null;
  }

  const esUltimo =
    state.paso >= PASOS_TOUR_CENTRO_INTELIGENCIA.length - 1;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-primary/40 bg-white p-4 shadow-lg dark:bg-gray-dark"
      role="dialog"
      aria-label="Tour Centro de Inteligencia"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        Tour · paso {state.paso + 1} de{' '}
        {PASOS_TOUR_CENTRO_INTELIGENCIA.length}
      </p>
      <h3 className="mt-1 text-base font-semibold text-dark dark:text-white">
        {pasoActual.titulo}
      </h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {pasoActual.descripcion}
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            persist({ ...state, omitido: true, completado: false })
          }
        >
          Omitir
        </Button>
        {!esUltimo ? (
          <Button
            type="button"
            size="sm"
            onClick={() => persist({ ...state, paso: state.paso + 1 })}
          >
            Siguiente
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() =>
              persist({ ...state, completado: true, paso: state.paso })
            }
          >
            Listo
          </Button>
        )}
      </div>
    </div>
  );
}
