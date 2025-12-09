import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { graphqlRequest } from "@/lib/graphql/client";

export function useGraphQLMutation<TData = any, TVariables = Record<string, any>>(
  query: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn">
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables: TVariables) => graphqlRequest<TData>(query, variables),
    ...options,
  });
}
