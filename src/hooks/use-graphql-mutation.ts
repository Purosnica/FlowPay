import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { graphqlRequest, GraphQLRequestError } from "@/lib/graphql/client";

export function useGraphQLMutation<TData = any, TVariables extends Record<string, any> = Record<string, any>>(
  query: string,
  options?: Omit<UseMutationOptions<TData, GraphQLRequestError, TVariables>, "mutationFn">
) {
  return useMutation<TData, GraphQLRequestError, TVariables>({
    mutationFn: (variables: TVariables) => graphqlRequest<TData>(query, variables as Record<string, any>),
    ...options,
  });
}






