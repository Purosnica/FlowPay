'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BandejaFilters } from '@/types/cobranza';
import {
  PRESETS_BANDEJA_SISTEMA,
  STORAGE_KEY_BANDEJA_PRESETS,
  type BandejaPreset,
} from '@/lib/cobranza/bandeja-presets';

function clavePresets(idusuario: number): string {
  return `${STORAGE_KEY_BANDEJA_PRESETS}.${idusuario}`;
}

function cargarPresetsPersonalizados(idusuario: number | null): BandejaPreset[] {
  if (typeof window === 'undefined' || idusuario == null) {
    return [];
  }
  try {
    const raw =
      localStorage.getItem(clavePresets(idusuario)) ??
      // Migración suave: presets legacy sin usuario
      (idusuario != null
        ? localStorage.getItem(STORAGE_KEY_BANDEJA_PRESETS)
        : null);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as BandejaPreset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useBandejaPresets(idusuario: number | null) {
  const [personalizados, setPersonalizados] = useState<BandejaPreset[]>([]);

  useEffect(() => {
    setPersonalizados(cargarPresetsPersonalizados(idusuario));
  }, [idusuario]);

  const todos = [...PRESETS_BANDEJA_SISTEMA, ...personalizados];

  const guardarPreset = useCallback(
    (nombre: string, filters: BandejaFilters) => {
      if (idusuario == null) {
        return null;
      }
      const id = `custom_${Date.now()}`;
      const nuevo: BandejaPreset = {
        id,
        nombre: nombre.trim(),
        filters: {
          idmandante: filters.idmandante,
          tramoMoraMin: filters.tramoMoraMin,
          tramoMoraMax: filters.tramoMoraMax,
          ordenarPor: filters.ordenarPor,
          soloPromesaVencida: filters.soloPromesaVencida,
          soloAgendaHoy: filters.soloAgendaHoy,
          soloSinGestion: filters.soloSinGestion,
          prioridadMin: filters.prioridadMin,
        },
      };
      const actualizados = [...personalizados, nuevo];
      setPersonalizados(actualizados);
      localStorage.setItem(
        clavePresets(idusuario),
        JSON.stringify(actualizados),
      );
      return nuevo;
    },
    [personalizados, idusuario],
  );

  const eliminarPreset = useCallback(
    (id: string) => {
      if (idusuario == null) {
        return;
      }
      const actualizados = personalizados.filter((p) => p.id !== id);
      setPersonalizados(actualizados);
      localStorage.setItem(
        clavePresets(idusuario),
        JSON.stringify(actualizados),
      );
    },
    [personalizados, idusuario],
  );

  return { todos, personalizados, guardarPreset, eliminarPreset };
}
