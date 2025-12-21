"use client";

import { useGraphQLQuery } from "./use-graphql-query";
import { useGraphQLMutation } from "./use-graphql-mutation";
import { useQueryClient } from "@tanstack/react-query";
import {
  GET_GESTIONES,
  GET_GESTION,
  GET_GESTIONES_BY_PRESTAMO,
  GET_GESTIONES_PENDIENTES,
  GET_RESULTADOS_GESTION,
} from "@/lib/graphql/queries/cobranza.queries";
import {
  CREATE_GESTION,
  UPDATE_GESTION,
} from "@/lib/graphql/queries/cobranza.mutations";

export interface GestionFilters {
  page?: number;
  pageSize?: number;
  idprestamo?: number;
  idusuario?: number;
  tipoGestion?: string;
  estado?: string;
  fechaDesde?: Date | string;
  fechaHasta?: Date | string;
}

export function useGestiones(filters?: GestionFilters) {
  return useGraphQLQuery(
    GET_GESTIONES,
    { filters },
    {
      enabled: true,
      staleTime: 30 * 1000,
    }
  );
}

export function useGestion(id: number) {
  return useGraphQLQuery(
    GET_GESTION,
    { id },
    {
      enabled: !!id,
    }
  );
}

export function useGestionesByPrestamo(idprestamo: number) {
  return useGraphQLQuery(
    GET_GESTIONES_BY_PRESTAMO,
    { idprestamo },
    {
      enabled: !!idprestamo,
    }
  );
}

export function useGestionesPendientes(filters?: GestionFilters) {
  return useGraphQLQuery(
    GET_GESTIONES_PENDIENTES,
    { filters },
    {
      enabled: true,
      staleTime: 30 * 1000,
    }
  );
}

export function useResultadosGestion(activos: boolean = true) {
  return useGraphQLQuery(
    GET_RESULTADOS_GESTION,
    { activos },
    {
      staleTime: 5 * 60 * 1000, // 5 minutos (catálogo)
    }
  );
}

export function useCreateGestion() {
  const queryClient = useQueryClient();

  return useGraphQLMutation(
    CREATE_GESTION,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [GET_GESTIONES] });
        queryClient.invalidateQueries({ queryKey: [GET_GESTIONES_BY_PRESTAMO] });
        queryClient.invalidateQueries({ queryKey: [GET_GESTIONES_PENDIENTES] });
      },
    }
  );
}

export function useUpdateGestion() {
  const queryClient = useQueryClient();

  return useGraphQLMutation(
    UPDATE_GESTION,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [GET_GESTIONES] });
        queryClient.invalidateQueries({ queryKey: [GET_GESTION] });
      },
    }
  );
}

