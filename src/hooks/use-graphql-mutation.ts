import { type UseMutationOptions, useMutation } from '@tanstack/react-query';

import {
  type GraphQLRequestError,
  type GraphQLRequestOptions,
  graphqlRequest,
} from '@/lib/graphql/client';
import { notificationToast } from '@/lib/notifications/notification-toast';

type SuccessMessageResolver<TData, TVariables> =
  | string
  | ((data: TData, variables: TVariables) => string);

export type GraphQLMutationFeedbackOptions<TData, TVariables> = {
  /**
   * Toast de éxito al completar la mutación.
   * Los errores ya se notifican desde el cliente GraphQL (salvo suppressErrorToast).
   */
  successMessage?: SuccessMessageResolver<TData, TVariables>;
  successTitle?: string;
};

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
  } & GraphQLMutationFeedbackOptions<TData, TVariables>,
) {
  const {
    requestOptions,
    successMessage,
    successTitle = 'Éxito',
    onSuccess,
    ...mutationOptions
  } = options ?? {};

  return useMutation<TData, GraphQLRequestError, TVariables>({
    mutationFn: (variables: TVariables) =>
      graphqlRequest<TData>(
        query,
        variables as Record<string, unknown>,
        requestOptions,
      ),
    ...mutationOptions,
    onSuccess: (data, variables, onMutateResult, context) => {
      if (successMessage) {
        const message =
          typeof successMessage === 'function'
            ? successMessage(data, variables)
            : successMessage;
        notificationToast.success(message, successTitle);
      }
      return onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}






