/**
 * Allowlist de operationName en producción (I053).
 * Reduce superficie: solo operaciones del cliente oficial.
 */

import { GraphQLError, Kind, type ASTVisitor, type ValidationContext, type ValidationRule } from 'graphql';
import { PERSISTED_OPERATION_NAMES } from '@/lib/graphql/persisted-operations.generated';

const ALLOWED = new Set<string>(PERSISTED_OPERATION_NAMES);

export function persistedQueriesEnforced(): boolean {
  const raw = process.env.GRAPHQL_PERSISTED_ONLY;
  if (raw === 'false' || raw === '0') {
    return false;
  }
  if (raw === 'true' || raw === '1') {
    return true;
  }
  return process.env.NODE_ENV === 'production';
}

export function isPersistedOperationAllowed(name: string | null | undefined): boolean {
  if (!name || !name.trim()) {
    return false;
  }
  return ALLOWED.has(name.trim());
}

/**
 * ValidationRule: exige operationName en allowlist cuando enforced.
 */
export function createPersistedOperationsRule(): ValidationRule {
  return function PersistedOperationsRule(
    context: ValidationContext,
  ): ASTVisitor {
    if (!persistedQueriesEnforced()) {
      return {};
    }

    return {
      OperationDefinition(node) {
        const name = node.name?.value;
        if (!isPersistedOperationAllowed(name)) {
          context.reportError(
            new GraphQLError(
              'Operación GraphQL no permitida. Use un operationName del cliente oficial.',
              {
                nodes: node,
                extensions: { code: 'GRAPHQL_PERSISTED_ONLY' },
              },
            ),
          );
        }
      },
      // Rechaza documentos anónimos sin OperationDefinition name vía enter vacío
      Document: {
        enter(doc) {
          const ops = doc.definitions.filter(
            (d) => d.kind === Kind.OPERATION_DEFINITION,
          );
          for (const op of ops) {
            if (op.kind === Kind.OPERATION_DEFINITION && !op.name) {
              context.reportError(
                new GraphQLError(
                  'Se requiere operationName en producción.',
                  {
                    nodes: op,
                    extensions: { code: 'GRAPHQL_PERSISTED_ONLY' },
                  },
                ),
              );
            }
          }
        },
      },
    };
  };
}

export function extractOperationNameFromQuery(
  query: string,
): string | undefined {
  const match = query.match(
    /\b(?:query|mutation|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)/,
  );
  return match?.[1];
}
