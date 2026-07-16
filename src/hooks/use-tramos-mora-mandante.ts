'use client';

import { useMemo } from 'react';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_COMISIONES_COBRO } from '@/lib/graphql/queries/cobranza.queries';
import {
  formatTramoMoraLabel,
  type TramoMoraDef,
} from '@/lib/cobranza/tramos-mora';
import type { ComisionCobro } from '@/types/cobranza';

interface ComisionesCobroPage {
  comisiones: ComisionCobro[];
}

/**
 * Tramos de mora activos según parametrización del Mandante.
 */
export function useTramosMoraMandante(
  idmandante: number | undefined,
): {
  tramos: TramoMoraDef[];
  isLoading: boolean;
} {
  const enabled = typeof idmandante === 'number' && idmandante > 0;

  const { data, isLoading } = useGraphQLQuery<{
    comisionesCobro: ComisionesCobroPage;
  }>(
    GET_COMISIONES_COBRO,
    { idmandante: idmandante ?? 0, page: 1, pageSize: 100 },
    { enabled },
  );

  const tramos = useMemo(() => {
    if (!enabled) {
      return [];
    }
    const rows = data?.comisionesCobro.comisiones ?? [];
    return rows
      .filter((c) => c.estado)
      .slice()
      .sort((a, b) => a.tramoMoraMin - b.tramoMoraMin)
      .map(
        (c): TramoMoraDef => ({
          tramo: formatTramoMoraLabel(c.tramoMoraMin, c.tramoMoraMax),
          tramoMoraMin: c.tramoMoraMin,
          tramoMoraMax: c.tramoMoraMax,
        }),
      );
  }, [data, enabled]);

  return { tramos, isLoading: enabled && isLoading };
}
