'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BandejaFilters } from '@/types/cobranza';
import {
  PRESETS_BANDEJA_SISTEMA,
  STORAGE_KEY_BANDEJA_PRESETS,
  type BandejaPreset,
} from '@/lib/cobranza/bandeja-presets';

function cargarPresetsPersonalizados(): BandejaPreset[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BANDEJA_PRESETS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as BandejaPreset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useBandejaPresets() {
  const [personalizados, setPersonalizados] = useState<BandejaPreset[]>([]);

  useEffect(() => {
    setPersonalizados(cargarPresetsPersonalizados());
  }, []);

  const todos = [...PRESETS_BANDEJA_SISTEMA, ...personalizados];

  const guardarPreset = useCallback(
    (nombre: string, filters: BandejaFilters) => {
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
        STORAGE_KEY_BANDEJA_PRESETS,
        JSON.stringify(actualizados),
      );
      return nuevo;
    },
    [personalizados],
  );

  const eliminarPreset = useCallback(
    (id: string) => {
      const actualizados = personalizados.filter((p) => p.id !== id);
      setPersonalizados(actualizados);
      localStorage.setItem(
        STORAGE_KEY_BANDEJA_PRESETS,
        JSON.stringify(actualizados),
      );
    },
    [personalizados],
  );

  return { todos, personalizados, guardarPreset, eliminarPreset };
}
