/**
 * Límites de profundidad, campos y costo ponderado en consultas GraphQL.
 * Sin dependencias externas (evita DoS por queries anidadas / listas grandes).
 */

import {
  GraphQLError,
  Kind,
  type ASTVisitor,
  type FieldNode,
  type ValidationContext,
  type ValidationRule,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';

export const GRAPHQL_MAX_DEPTH_DEFAULT = 12;
export const GRAPHQL_MAX_FIELDS_DEFAULT = 250;
export const GRAPHQL_MAX_COST_DEFAULT = 1000;
export const GRAPHQL_LIST_COST_DEFAULT = 10;

const LIST_SIZE_ARG_NAMES = new Set([
  'pageSize',
  'first',
  'take',
  'limite',
  'limit',
]);

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

function resolverMaxCost(): number {
  const raw = process.env.GRAPHQL_MAX_COST;
  if (!raw) {
    return GRAPHQL_MAX_COST_DEFAULT;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : GRAPHQL_MAX_COST_DEFAULT;
}

function resolverListCostDefault(): number {
  const raw = process.env.GRAPHQL_LIST_COST_DEFAULT;
  if (!raw) {
    return GRAPHQL_LIST_COST_DEFAULT;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : GRAPHQL_LIST_COST_DEFAULT;
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

function listMultiplierFromField(
  field: FieldNode,
  defaultListCost: number,
): number {
  const args = field.arguments ?? [];
  let sawListArg = false;
  for (const arg of args) {
    if (!LIST_SIZE_ARG_NAMES.has(arg.name.value)) {
      continue;
    }
    sawListArg = true;
    if (arg.value.kind === Kind.INT) {
      const n = Number.parseInt(arg.value.value, 10);
      if (Number.isFinite(n) && n > 0) {
        return Math.min(n, 100);
      }
    }
    if (arg.value.kind === Kind.VARIABLE) {
      return defaultListCost;
    }
  }
  // Solo ponderar listas (args pageSize/first/take/limite).
  // Objetos anidados (cliente, mandante, etc.) cuestan 1 + hijos.
  return sawListArg ? defaultListCost : 1;
}

function costOfSelection(
  selection: SelectionNode,
  defaultListCost: number,
): number {
  if (selection.kind === Kind.FIELD) {
    if (selection.name.value.startsWith('__')) {
      return 0;
    }
    const childCost = selection.selectionSet
      ? costOfSelectionSet(selection.selectionSet, defaultListCost)
      : 0;
    const multiplier = listMultiplierFromField(selection, defaultListCost);
    return 1 + childCost * multiplier;
  }
  if (selection.kind === Kind.INLINE_FRAGMENT && selection.selectionSet) {
    return costOfSelectionSet(selection.selectionSet, defaultListCost);
  }
  if (selection.kind === Kind.FRAGMENT_SPREAD) {
    // Sin resolución de fragmentos: costo conservador fijo (no multiplicador de lista).
    return 1;
  }
  return 0;
}

function costOfSelectionSet(
  selectionSet: SelectionSetNode,
  defaultListCost: number,
): number {
  let total = 0;
  for (const selection of selectionSet.selections) {
    total += costOfSelection(selection, defaultListCost);
  }
  return total;
}

/**
 * Costo ponderado: campos de lista multiplican el subárbol por pageSize/limite
 * (o GRAPHQL_LIST_COST_DEFAULT si no hay literal).
 */
export function estimateQueryCost(
  selectionSet: SelectionSetNode,
  defaultListCost: number = resolverListCostDefault(),
): number {
  return costOfSelectionSet(selectionSet, defaultListCost);
}

/**
 * Rechaza operaciones cuyo costo ponderado supera el máximo.
 */
export function createMaxCostRule(
  maxCost: number = resolverMaxCost(),
  defaultListCost: number = resolverListCostDefault(),
): ValidationRule {
  return function MaxCostRule(context: ValidationContext): ASTVisitor {
    return {
      OperationDefinition: {
        enter(node) {
          const cost = estimateQueryCost(node.selectionSet, defaultListCost);
          if (cost > maxCost) {
            context.reportError(
              new GraphQLError(
                `Costo de consulta excedido (${cost} > máximo ${maxCost}).`,
                { extensions: { code: 'GRAPHQL_COST_LIMIT', cost, maxCost } },
              ),
            );
          }
        },
      },
    };
  };
}
