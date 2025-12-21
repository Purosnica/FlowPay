import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { graphqlRequest, GraphQLRequestError } from "@/lib/graphql/client";

export function useGraphQLMutation<
  TData = unknown,
  TVariables extends Record<string, unknown> = Record<string, unknown>
>(
  query: string,
  options?: Omit<
    UseMutationOptions<TData, GraphQLRequestError, TVariables>,
    "mutationFn"
  >
) {
  return useMutation<TData, GraphQLRequestError, TVariables>({
    mutationFn: (variables: TVariables) =>
      graphqlRequest<TData>(query, variables as Record<string, unknown>),
    ...options,
  });
}






