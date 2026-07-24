'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { crearIdempotencyKey } from '@/lib/api/idempotency-key';
import { trackGestionCreated } from '@/lib/analytics/product-analytics';
import { graphqlRequest } from '@/lib/graphql/client';
import {
  construirNotaGestionContacto,
  resolverIdCodAccionPorCanal,
  type CanalGestionContacto,
} from '@/lib/logic/gestion-contacto-auto-logic';
import {
  CREATE_GESTION,
  GET_CODIGOS_ACCION,
  GET_GESTIONES,
  GET_GESTIONES_HOY,
  GET_BANDEJA_COBRADOR,
  GET_RESUMEN_MI_DIA,
} from '@/lib/graphql/queries/cobranza.queries';
import {
  encolarGestionOutbox,
  estaOffline,
} from '@/lib/offline/gestion-outbox';
import type { CodigoAccion } from '@/types/cobranza';

export type RegistrarGestionContactoInput = {
  idprestamo: number;
  canal: CanalGestionContacto;
  telefono?: string | null;
  mensajeSnippet?: string | null;
};

export type RegistrarGestionContactoResult =
  | { ok: true; offline: boolean }
  | { ok: false; error: string };

type CreateGestionVars = {
  input: {
    idprestamo: number;
    idcodaccion?: number;
    telefonoContacto?: string;
    nota: string;
    idempotencyKey?: string;
  };
};

type CodigosAccionQuery = {
  codigosAccion: CodigoAccion[];
};

/**
 * Registra una gestión al iniciar contacto por llamada / WA / SMS / email.
 * No bloquea la apertura del canal; el caller dispara y sigue.
 */
export function useRegistrarGestionContacto(opts?: {
  successMessage?: string;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const enVuelo = useRef(
    new Map<string, Promise<RegistrarGestionContactoResult>>(),
  );

  const { data: codigosData } = useGraphQLQuery<CodigosAccionQuery>(
    GET_CODIGOS_ACCION,
    undefined,
    {
      enabled: opts?.enabled !== false,
      staleTime: 5 * 60 * 1000,
    },
  );

  const mutation = useGraphQLMutation<
    { createGestion: { idgestion: number } },
    CreateGestionVars
  >(CREATE_GESTION, {
    successMessage:
      opts?.successMessage ?? 'Gestión de contacto registrada',
    onSuccess: () => {
      trackGestionCreated();
      void queryClient.invalidateQueries({ queryKey: [GET_GESTIONES] });
      void queryClient.invalidateQueries({ queryKey: [GET_GESTIONES_HOY] });
      void queryClient.invalidateQueries({
        queryKey: [GET_BANDEJA_COBRADOR],
      });
      void queryClient.invalidateQueries({
        queryKey: [GET_RESUMEN_MI_DIA],
      });
    },
  });

  const resolverCodigosAccion = useCallback(async (): Promise<
    CodigoAccion[]
  > => {
    if (codigosData?.codigosAccion?.length) {
      return codigosData.codigosAccion;
    }
    const data = await queryClient.fetchQuery({
      queryKey: [GET_CODIGOS_ACCION, undefined],
      queryFn: () =>
        graphqlRequest<CodigosAccionQuery>(GET_CODIGOS_ACCION),
      staleTime: 5 * 60 * 1000,
    });
    return data.codigosAccion ?? [];
  }, [codigosData?.codigosAccion, queryClient]);

  const registrar = useCallback(
    async (
      input: RegistrarGestionContactoInput,
    ): Promise<RegistrarGestionContactoResult> => {
      const clave = `${input.idprestamo}:${input.canal}:${input.telefono ?? ''}`;
      const pendiente = enVuelo.current.get(clave);
      if (pendiente) {
        return pendiente;
      }

      const trabajo = (async (): Promise<RegistrarGestionContactoResult> => {
        try {
          const nota = construirNotaGestionContacto(input.canal, {
            mensajeSnippet: input.mensajeSnippet,
          });
          const codigos = await resolverCodigosAccion();
          const idcodaccion = resolverIdCodAccionPorCanal(
            codigos,
            input.canal,
          );
          const telefonoContacto = input.telefono?.trim() || undefined;
          const payload = {
            idprestamo: input.idprestamo,
            idcodaccion,
            telefonoContacto,
            nota,
          };

          if (estaOffline()) {
            await encolarGestionOutbox({
              ...payload,
              idempotencyKey: crearIdempotencyKey('ges'),
            });
            trackGestionCreated();
            return { ok: true, offline: true };
          }

          await mutation.mutateAsync({ input: payload });
          return { ok: true, offline: false };
        } catch (err) {
          return {
            ok: false,
            error:
              err instanceof Error
                ? err.message
                : 'No se pudo registrar la gestión',
          };
        } finally {
          enVuelo.current.delete(clave);
        }
      })();

      enVuelo.current.set(clave, trabajo);
      return trabajo;
    },
    [mutation, resolverCodigosAccion],
  );

  return {
    registrar,
    isPending: mutation.isPending,
  };
}
