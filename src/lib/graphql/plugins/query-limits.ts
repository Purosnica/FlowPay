/**
 * Límites de profundidad y cantidad de campos en consultas GraphQL.
 * Sin dependencias externas (evita DoS por queries anidadas).
 */

import {
  GraphQLError,
  Kind,
  type ASTVisitor,
  type ValidationContext,
  type ValidationRule,
} from 'graphql';

export const GRAPHQL_MAX_DEPTH_DEFAULT = 12;
export const GRAPHQL_MAX_FIELDS_DEFAULT = 250;

function resolverMaxDepth(): number {
  const raw = process.env.GRAPHQL_MAX_DEPTH;
  if (!raw) {
    return GRAPHQL_MAX_DEPTH_DEFAULT;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : GRAPHQL_MAX_DEPTH_DEFAULT;
}

function resolverMaxFields(): number {
  const raw = process.env.GRAPHQL_MAX_FIELDS;
  if (!raw) {
    return GRAPHQL_MAX_FIELDS_DEFAULT;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : GRAPHQL_MAX_FIELDS_DEFAULT;
}

/**
 * Cuenta profundidad de SelectionSet anidados bajo Field.
 */
export function createMaxDepthRule(
  maxDepth: number = resolverMaxDepth(),
): ValidationRule {
  return function MaxDepthRule(context: ValidationContext): ASTVisitor {
    let depth = 0;

    return {
      SelectionSet: {
        enter(_node, _key, parent) {
          if (
            parent &&
            typeof parent === 'object' &&
            'kind' in parent &&
            parent.kind === Kind.FIELD
          ) {
            depth += 1;
            if (depth > maxDepth) {
              context.reportError(
                new GraphQLError(
                  `Profundidad de consulta excedida (máximo ${maxDepth}).`,
                  { extensions: { code: 'GRAPHQL_DEPTH_LIMIT' } },
                ),
              );
            }
          }
        },
        leave(_node, _key, parent) {
          if (
            parent &&
            typeof parent === 'object' &&
            'kind' in parent &&
            parent.kind === Kind.FIELD
          ) {
            depth -= 1;
          }
        },
      },
    };
  };
}

/**
 * Limita el número total de nodos Field en la operación.
 */
export function createMaxFieldsRule(
  maxFields: number = resolverMaxFields(),
): ValidationRule {
  return function MaxFieldsRule(context: ValidationContext): ASTVisitor {
    let count = 0;

    return {
      Field: {
        enter() {
          count += 1;
          if (count > maxFields) {
            context.reportError(
              new GraphQLError(
                `Consulta demasiado amplia (máximo ${maxFields} campos).`,
                { extensions: { code: 'GRAPHQL_FIELD_LIMIT' } },
              ),
            );
          }
        },
      },
    };
  };
}
