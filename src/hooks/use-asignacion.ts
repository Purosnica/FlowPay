"use client";

import { useGraphQLQuery } from "./use-graphql-query";
import { useGraphQLMutation } from "./use-graphql-mutation";
import { useQueryClient } from "@tanstack/react-query";
import {
  GET_ASIGNACIONES,
  GET_ASIGNACION,
  GET_CARTERA_POR_COBRADOR,
  GET_PRESTAMOS_ASIGNADOS_A_COBRADOR,
} from "@/lib/graphql/queries/cobranza.queries";
import {
  ASIGNAR_CARTERA,
  REASIGNAR_CARTERA,
  DESASIGNAR_CARTERA,
} from "@/lib/graphql/queries/cobranza.mutations";

export interface AsignacionFilters {
  page?: number;
  pageSize?: number;
  idprestamo?: number;
  idusuario?: number;
  activa?: boolean;
}

export function useAsignaciones(filters?: AsignacionFilters) {
  return useGraphQLQuery(
    GET_ASIGNACIONES,
    { filters },
    {
      enabled: true,
      staleTime: 30 * 1000,
    }
  );
}

export function useAsignacion(id: number) {
  return useGraphQLQuery(
    GET_ASIGNACION,
    { id },
    {
      enabled: !!id,
    }
  );
}

export function useCarteraPorCobrador(idusuario: number) {
  return useGraphQLQuery(
    GET_CARTERA_POR_COBRADOR,
    { idusuario },
    {
      enabled: !!idusuario,
      staleTime: 30 * 1000,
    }
  );
}

export function usePrestamosAsignadosACobrador(idusuario: number) {
  return useGraphQLQuery(
    GET_PRESTAMOS_ASIGNADOS_A_COBRADOR,
    { idusuario },
    {
      enabled: !!idusuario,
      staleTime: 30 * 1000,
    }
  );
}

export function useAsignarCartera() {
  const queryClient = useQueryClient();

  return useGraphQLMutation(
    ASIGNAR_CARTERA,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [GET_ASIGNACIONES] });
        queryClient.invalidateQueries({ queryKey: [GET_CARTERA_POR_COBRADOR] });
        queryClient.invalidateQueries({ queryKey: [GET_PRESTAMOS_ASIGNADOS_A_COBRADOR] });
      },
    }
  );
}

export function useReasignarCartera() {
  const queryClient = useQueryClient();

  return useGraphQLMutation(
    REASIGNAR_CARTERA,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [GET_ASIGNACIONES] });
        queryClient.invalidateQueries({ queryKey: [GET_CARTERA_POR_COBRADOR] });
      },
    }
  );
}

export function useDesasignarCartera() {
  const queryClient = useQueryClient();

  return useGraphQLMutation(
    DESASIGNAR_CARTERA,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [GET_ASIGNACIONES] });
        queryClient.invalidateQueries({ queryKey: [GET_CARTERA_POR_COBRADOR] });
      },
    }
  );
}

