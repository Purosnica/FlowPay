import { type UseMutationOptions, useMutation } from '@tanstack/react-query';

import {
  type GraphQLRequestError,
  type GraphQLRequestOptions,
  graphqlRequest,
} from '@/lib/graphql/client';

export function useGraphQLMutation<
  TData = unknown,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(
  query: string,
  options?: Omit<
    UseMutationOptions<TData, GraphQLRequestError, TVariables>,
    'mutationFn'
  > & {
    requestOptions?: GraphQLRequestOptions;
  },
) {
  const { requestOptions, ...mutationOptions } = options ?? {};

  return useMutation<TData, GraphQLRequestError, TVariables>({
    mutationFn: (variables: TVariables) =>
      graphqlRequest<TData>(
        query,
        variables as Record<string, unknown>,
        requestOptions,
      ),
    ...mutationOptions,
  });
}






