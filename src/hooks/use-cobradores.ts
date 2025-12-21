"use client";

import { useGraphQLQuery } from "./use-graphql-query";
import { GET_COBRADORES } from "@/lib/graphql/queries/cobranza.queries";

export function useCobradores() {
  return useGraphQLQuery(
    GET_COBRADORES,
    {},
    {
      staleTime: 5 * 60 * 1000, // 5 minutos (catálogo)
    }
  );
}

