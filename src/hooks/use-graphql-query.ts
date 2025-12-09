import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { graphqlRequest } from "@/lib/graphql/client";

export function useGraphQLQuery<T = any>(
  query: string,
  variables?: Record<string, any>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  return useQuery<T>({
    queryKey: [query, variables],
    queryFn: () => graphqlRequest<T>(query, variables),
    ...options,
  });
}
