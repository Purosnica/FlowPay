'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  claveOnboardingLegacyCobrador,
  claveOnboardingRol,
  ESTADO_ONBOARDING_INICIAL,
  pasosOnboardingPorRol,
  rolTieneOnboarding,
  type EstadoOnboarding,
} from '@/lib/onboarding/onboarding-por-rol';
import { ROL } from '@/lib/permissions/role-codes';

function cargarEstado(clave: string): EstadoOnboarding | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(clave);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<EstadoOnboarding>;
    return {
      omitido: Boolean(parsed.omitido),
      pasosCompletados: Array.isArray(parsed.pasosCompletados)
        ? parsed.pasosCompletados
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Onboarding medible por rol (I046). Reemplaza el hook solo-cobrador.
 */
export function useOnboardingPorRol(
  idusuario: number | null,
  rolCodigo: string | null,
  habilitado: boolean,
) {
  const [hidratado, setHidratado] = useState(false);
  const [estado, setEstado] = useState<EstadoOnboarding>(
    ESTADO_ONBOARDING_INICIAL,
  );

  const pasos = useMemo(
    () => pasosOnboardingPorRol(rolCodigo),
    [rolCodigo],
  );

  useEffect(() => {
    if (idusuario == null || !rolCodigo || !rolTieneOnboarding(rolCodigo)) {
      return;
    }
    const clave = claveOnboardingRol(idusuario, rolCodigo);
    let cargado = cargarEstado(clave);
    if (!cargado && rolCodigo === ROL.COBRADOR) {
      cargado = cargarEstado(claveOnboardingLegacyCobrador(idusuario));
    }
    setEstado(cargado ?? ESTADO_ONBOARDING_INICIAL);
    setHidratado(true);
  }, [idusuario, rolCodigo]);

  const persistir = useCallback(
    (siguiente: EstadoOnboarding) => {
      if (idusuario == null || !rolCodigo) {
        return;
      }
      setEstado(siguiente);
      localStorage.setItem(
        claveOnboardingRol(idusuario, rolCodigo),
        JSON.stringify(siguiente),
      );
    },
    [idusuario, rolCodigo],
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
        if (idusuario != null && rolCodigo) {
          localStorage.setItem(
            claveOnboardingRol(idusuario, rolCodigo),
            JSON.stringify(siguiente),
          );
        }
        return siguiente;
      });
    },
    [idusuario, rolCodigo],
  );

  const omitir = useCallback(() => {
    persistir({ ...estado, omitido: true });
  }, [estado, persistir]);

  const reiniciar = useCallback(() => {
    persistir(ESTADO_ONBOARDING_INICIAL);
  }, [persistir]);

  const totalPasos = pasos.length;
  const completados = estado.pasosCompletados.length;
  const finalizado = totalPasos > 0 && completados >= totalPasos;
  const visible =
    habilitado &&
    hidratado &&
    rolTieneOnboarding(rolCodigo) &&
    !estado.omitido &&
    !finalizado;

  const pasosCompletados = useMemo(
    () => new Set(estado.pasosCompletados),
    [estado.pasosCompletados],
  );

  const progresoPct =
    totalPasos > 0 ? Math.round((completados / totalPasos) * 100) : 0;

  return {
    visible,
    pasos,
    pasosCompletados,
    completados,
    totalPasos,
    progresoPct,
    finalizado,
    marcarPaso,
    omitir,
    reiniciar,
  };
}

/** Compat: onboarding cobrador con la firma anterior. */
export function useOnboardingCobrador(
  idusuario: number | null,
  habilitado: boolean,
) {
  return useOnboardingPorRol(idusuario, ROL.COBRADOR, habilitado);
}
