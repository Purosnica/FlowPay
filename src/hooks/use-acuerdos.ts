"use client";

import { useGraphQLQuery } from "./use-graphql-query";
import { useGraphQLMutation } from "./use-graphql-mutation";
import { useQueryClient } from "@tanstack/react-query";
import {
  GET_ACUERDOS,
  GET_ACUERDO,
  GET_ACUERDOS_BY_PRESTAMO,
  GET_ACUERDOS_VENCIDOS,
} from "@/lib/graphql/queries/cobranza.queries";
import {
  CREATE_ACUERDO,
  UPDATE_ACUERDO,
  DELETE_ACUERDO,
} from "@/lib/graphql/queries/cobranza.mutations";

export interface AcuerdoFilters {
  page?: number;
  pageSize?: number;
  idprestamo?: number;
  idusuario?: number;
  tipoAcuerdo?: string;
  estado?: string;
  fechaDesde?: Date | string;
  fechaHasta?: Date | string;
}

export function useAcuerdos(filters?: AcuerdoFilters) {
  return useGraphQLQuery(
    GET_ACUERDOS,
    { filters },
    {
      enabled: true,
      staleTime: 30 * 1000,
    }
  );
}

export function useAcuerdo(id: number) {
  return useGraphQLQuery(
    GET_ACUERDO,
    { id },
    {
      enabled: !!id,
    }
  );
}

export function useAcuerdosByPrestamo(idprestamo: number, activos?: boolean) {
  return useGraphQLQuery(
    GET_ACUERDOS_BY_PRESTAMO,
    { idprestamo, activos },
    {
      enabled: !!idprestamo,
    }
  );
}

export function useAcuerdosVencidos(filters?: AcuerdoFilters) {
  return useGraphQLQuery(
    GET_ACUERDOS_VENCIDOS,
    { filters },
    {
      enabled: true,
      staleTime: 30 * 1000,
    }
  );
}

export function useCreateAcuerdo() {
  const queryClient = useQueryClient();

  return useGraphQLMutation(
    CREATE_ACUERDO,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [GET_ACUERDOS] });
        queryClient.invalidateQueries({ queryKey: [GET_ACUERDOS_BY_PRESTAMO] });
        queryClient.invalidateQueries({ queryKey: [GET_ACUERDOS_VENCIDOS] });
      },
    }
  );
}

export function useUpdateAcuerdo() {
  const queryClient = useQueryClient();

  return useGraphQLMutation(
    UPDATE_ACUERDO,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [GET_ACUERDOS] });
        queryClient.invalidateQueries({ queryKey: [GET_ACUERDO] });
      },
    }
  );
}

export function useDeleteAcuerdo() {
  const queryClient = useQueryClient();

  return useGraphQLMutation(
    DELETE_ACUERDO,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [GET_ACUERDOS] });
      },
    }
  );
}

