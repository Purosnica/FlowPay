'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  claveOnboarding,
  ESTADO_ONBOARDING_INICIAL,
  PASOS_ONBOARDING_COBRADOR,
  type EstadoOnboarding,
} from '@/lib/onboarding/cobrador-onboarding';

function cargarEstado(clave: string): EstadoOnboarding {
  if (typeof window === 'undefined') {
    return ESTADO_ONBOARDING_INICIAL;
  }
  try {
    const raw = localStorage.getItem(clave);
    if (!raw) {
      return ESTADO_ONBOARDING_INICIAL;
    }
    const parsed = JSON.parse(raw) as Partial<EstadoOnboarding>;
    return {
      omitido: Boolean(parsed.omitido),
      pasosCompletados: Array.isArray(parsed.pasosCompletados)
        ? parsed.pasosCompletados
        : [],
    };
  } catch {
    return ESTADO_ONBOARDING_INICIAL;
  }
}

export function useOnboardingCobrador(
  idusuario: number | null,
  habilitado: boolean,
) {
  const [hidratado, setHidratado] = useState(false);
  const [estado, setEstado] = useState<EstadoOnboarding>(
    ESTADO_ONBOARDING_INICIAL,
  );

  useEffect(() => {
    if (idusuario == null) {
      return;
    }
    setEstado(cargarEstado(claveOnboarding(idusuario)));
    setHidratado(true);
  }, [idusuario]);

  const persistir = useCallback(
    (siguiente: EstadoOnboarding) => {
      if (idusuario == null) {
        return;
      }
      setEstado(siguiente);
      localStorage.setItem(
        claveOnboarding(idusuario),
        JSON.stringify(siguiente),
      );
    },
    [idusuario],
  );

  const marcarPaso = useCallback(
    (idpaso: string) => {
      setEstado((actual) => {
        if (actual.pasosCompletados.includes(idpaso)) {
          return actual;
        }
        const siguiente: EstadoOnboarding = {
          ...actual,
          pasosCompletados: [...actual.pasosCompletados, idpaso],
        };
        if (idusuario != null) {
          localStorage.setItem(
            claveOnboarding(idusuario),
            JSON.stringify(siguiente),
          );
        }
        return siguiente;
      });
    },
    [idusuario],
  );

  const omitir = useCallback(() => {
    persistir({ ...estado, omitido: true });
  }, [estado, persistir]);

  const reiniciar = useCallback(() => {
    persistir(ESTADO_ONBOARDING_INICIAL);
  }, [persistir]);

  const totalPasos = PASOS_ONBOARDING_COBRADOR.length;
  const completados = estado.pasosCompletados.length;
  const finalizado = completados >= totalPasos;
  const visible = habilitado && hidratado && !estado.omitido && !finalizado;

  const pasosCompletados = useMemo(
    () => new Set(estado.pasosCompletados),
    [estado.pasosCompletados],
  );

  return {
    visible,
    pasos: PASOS_ONBOARDING_COBRADOR,
    pasosCompletados,
    completados,
    totalPasos,
    finalizado,
    marcarPaso,
    omitir,
    reiniciar,
  };
}
