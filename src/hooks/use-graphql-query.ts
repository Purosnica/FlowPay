import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { graphqlRequest, GraphQLRequestError } from "@/lib/graphql/client";

export function useGraphQLQuery<T = any>(
  query: string,
  variables?: Record<string, any>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  return useQuery<T>({
    queryKey: [query, variables],
    queryFn: () => graphqlRequest<T>(query, variables),
    retry: (failureCount, error) => {
      // No reintentar en errores 4xx (client errors)
      if (error instanceof GraphQLRequestError) {
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          return false;
        }
      }
      // Reintentar hasta 3 veces para otros errores
      return failureCount < 3;
    },
    staleTime: 60 * 1000, // 1 minuto por defecto
    gcTime: 5 * 60 * 1000, // 5 minutos (antes cacheTime)
    ...options,
  });
}






