import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { graphqlRequest, GraphQLRequestError } from "@/lib/graphql/client";
import { useAuth } from "@/contexts/auth-context";

export function useGraphQLQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  const { usuario, loading: authLoading } = useAuth();

  // Determinar si la query debe estar habilitada
  const isAuthenticated = !authLoading && !!usuario;
  const enabled = options?.enabled !== undefined 
    ? options.enabled && isAuthenticated 
    : isAuthenticated;

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
    enabled, // Sobrescribir enabled con el valor calculado (debe ir después de ...options)
  });
}






