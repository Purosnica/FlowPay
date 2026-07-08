/**
 * Plugin GraphQL Yoga: exige usuario autenticado en cada operación.
 */

import type { Plugin } from 'graphql-yoga';
import type { GraphQLContext } from '../builder';
import { GraphQLAuthenticationError } from '@/lib/errors/graphql-errors';

export function useRequireAuthPlugin(): Plugin<GraphQLContext> {
  return {
    onExecute({ args }) {
      const ctx = args.contextValue;
      if (!ctx.usuario) {
        throw new GraphQLAuthenticationError(
          'Debes estar autenticado para realizar esta operación.',
        );
      }
    },
  };
}
