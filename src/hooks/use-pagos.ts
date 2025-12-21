"use client";

import { useGraphQLQuery } from "./use-graphql-query";
import { useGraphQLMutation } from "./use-graphql-mutation";
import { useQueryClient } from "@tanstack/react-query";
import {
  GET_PAGOS,
  GET_PAGO,
  GET_PAGOS_BY_PRESTAMO,
} from "@/lib/graphql/queries/cobranza.queries";
import {
  CREATE_PAGO,
  REGISTRAR_PAGO_CON_APLICACION,
  UPDATE_PAGO,
  DELETE_PAGO,
} from "@/lib/graphql/queries/cobranza.mutations";

export interface PagoFilters {
  page?: number;
  pageSize?: number;
  idprestamo?: number;
  idcuota?: number;
  idacuerdo?: number;
  idusuario?: number;
  metodoPago?: string;
  tipoCobro?: string;
  fechaDesde?: Date | string;
  fechaHasta?: Date | string;
}

export function usePagos(filters?: PagoFilters) {
  return useGraphQLQuery(
    GET_PAGOS,
    { filters },
    {
      enabled: true,
      staleTime: 30 * 1000, // 30 segundos
    }
  );
}

export function usePago(id: number) {
  return useGraphQLQuery(
    GET_PAGO,
    { id },
    {
      enabled: !!id,
    }
  );
}

export function usePagosByPrestamo(idprestamo: number, filters?: PagoFilters) {
  return useGraphQLQuery(
    GET_PAGOS_BY_PRESTAMO,
    { idprestamo, filters },
    {
      enabled: !!idprestamo,
    }
  );
}

export function useCreatePago() {
  const queryClient = useQueryClient();

  return useGraphQLMutation(
    CREATE_PAGO,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [GET_PAGOS] });
        queryClient.invalidateQueries({ queryKey: [GET_PAGOS_BY_PRESTAMO] });
      },
    }
  );
}

export function useRegistrarPagoConAplicacion() {
  const queryClient = useQueryClient();

  return useGraphQLMutation(
    REGISTRAR_PAGO_CON_APLICACION,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [GET_PAGOS] });
        queryClient.invalidateQueries({ queryKey: [GET_PAGOS_BY_PRESTAMO] });
        // Invalidar también las queries de préstamos para actualizar saldos
        queryClient.invalidateQueries({ queryKey: ["prestamo"] });
      },
    }
  );
}

export function useUpdatePago() {
  const queryClient = useQueryClient();

  return useGraphQLMutation(
    UPDATE_PAGO,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [GET_PAGOS] });
        queryClient.invalidateQueries({ queryKey: [GET_PAGO] });
      },
    }
  );
}

export function useDeletePago() {
  const queryClient = useQueryClient();

  return useGraphQLMutation(
    DELETE_PAGO,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [GET_PAGOS] });
      },
    }
  );
}

