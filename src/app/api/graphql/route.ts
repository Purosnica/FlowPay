import { createYoga } from 'graphql-yoga';
import { useValidationRule } from '@envelop/core';
import { NoSchemaIntrospectionCustomRule } from 'graphql';
import { schema } from '@/lib/graphql/schema';
import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';
import { getCurrentUser, getRequestInfo } from '@/lib/middleware/auth';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/security/rate-limit-service';
import { validarCsrfHeader } from '@/lib/security/csrf';
import { logger } from '@/lib/utils/logger';
import { ErrorCode } from '@/lib/errors/types';
import {
  GraphQLPermissionError,
  GraphQLAuthenticationError,
  GraphQLValidationError,
} from '@/lib/errors/graphql-errors';
import {
  esMensajeClienteSeguro,
  mensajeClienteSeguro,
} from '@/lib/errors/client-safe-message';
import { ServicioError } from '@/lib/services/error-types';
import { useRequireAuthPlugin } from '@/lib/graphql/plugins/require-auth-plugin';
import {
  createMaxDepthRule,
  createMaxFieldsRule,
  createMaxCostRule,
} from '@/lib/graphql/plugins/query-limits';
import { createPersistedOperationsRule } from '@/lib/graphql/plugins/persisted-queries';
import { useOperationMetricsPlugin } from '@/lib/graphql/plugins/operation-metrics';
import { quizásComprimirGraphqlResponse } from '@/lib/graphql/compress-response';
import { peekGraphqlOperationName } from '@/lib/graphql/peek-operation-name';
import { createGraphqlLoaders } from '@/lib/graphql/loaders';

interface FormattableGraphQLError {
  message: string;
  originalError?: Error;
  extensions?: Record<string, unknown>;
}

/** Contexto de Route Handler App Router (Next 15+). */
interface NextRouteContext {
  params: Promise<Record<string, string>>;
}

const introspectionPlugins =
  process.env.NODE_ENV === 'production'
    ? // eslint-disable-next-line react-hooks/rules-of-hooks -- plugin GraphQL Yoga, no React hook
      [useValidationRule(NoSchemaIntrospectionCustomRule)]
    : [];

const queryLimitPlugins = [
  // eslint-disable-next-line react-hooks/rules-of-hooks -- plugin GraphQL Yoga, no React hook
  useValidationRule(createMaxDepthRule()),
  // eslint-disable-next-line react-hooks/rules-of-hooks -- plugin GraphQL Yoga, no React hook
  useValidationRule(createMaxFieldsRule()),
  // eslint-disable-next-line react-hooks/rules-of-hooks -- plugin GraphQL Yoga, no React hook
  useValidationRule(createMaxCostRule()),
  // eslint-disable-next-line react-hooks/rules-of-hooks -- plugin GraphQL Yoga, no React hook
  useValidationRule(createPersistedOperationsRule()),
];

const { handleRequest } = createYoga<NextRouteContext>({
  schema,
  graphqlEndpoint: '/api/graphql',
  // Yoga debe usar el Response de Next; sin esto retorna undefined → 500 vacío.
  fetchAPI: { Response },
  context: async ({ request }) => {
    try {
      const usuario = await getCurrentUser(request as NextRequest);
      return {
        prisma,
        loaders: createGraphqlLoaders(prisma),
        usuario: usuario
          ? {
              idusuario: usuario.idusuario,
              nombre: usuario.nombre,
              email: usuario.email,
              idrol: usuario.idrol,
            }
          : null,
      };
    } catch (error) {
      logger.error(
        'Error al obtener usuario en contexto GraphQL',
        error instanceof Error ? error : undefined,
      );
      return {
        prisma,
        loaders: createGraphqlLoaders(prisma),
        usuario: null,
      };
    }
  },
  maskedErrors: process.env.NODE_ENV === 'production',
  graphiql: process.env.NODE_ENV === 'development',
  plugins: [
    ...introspectionPlugins,
    ...queryLimitPlugins,
    // eslint-disable-next-line react-hooks/rules-of-hooks -- plugin GraphQL Yoga, no React hook
    useRequireAuthPlugin(),
    // eslint-disable-next-line react-hooks/rules-of-hooks -- plugin GraphQL Yoga, no React hook
    useOperationMetricsPlugin(),
    {
      onExecute: () => ({
        onExecuteDone: ({
          result,
        }: {
          result: { errors?: FormattableGraphQLError[] };
        }) => {
          if (result.errors) {
            result.errors = result.errors.map(
              (error: FormattableGraphQLError) => {
                const originalError = error.originalError;

                if (originalError instanceof GraphQLPermissionError) {
                  return {
                    ...error,
                    extensions: originalError.extensions,
                  };
                }

                if (originalError instanceof GraphQLAuthenticationError) {
                  return {
                    ...error,
                    extensions: originalError.extensions,
                  };
                }

                if (originalError instanceof GraphQLValidationError) {
                  return {
                    ...error,
                    extensions: originalError.extensions,
                  };
                }

                if (originalError instanceof ServicioError) {
                  const userMessage = mensajeClienteSeguro(
                    originalError,
                    'Operación no válida.',
                  );
                  return {
                    ...error,
                    message: userMessage,
                    extensions: {
                      code: ErrorCode.VALIDATION_ERROR,
                      statusCode: 400,
                      userMessage,
                      timestamp: new Date().toISOString(),
                    },
                  };
                }

                if (error.extensions?.userMessage) {
                  return error;
                }

                const rawMsg = (originalError?.message ?? error.message).trim();
                if (
                  rawMsg === 'No tienes permiso' ||
                  rawMsg.startsWith('No tienes permiso')
                ) {
                  return {
                    ...error,
                    extensions: {
                      code: ErrorCode.FORBIDDEN,
                      statusCode: 403,
                      userMessage: rawMsg,
                      timestamp: new Date().toISOString(),
                    },
                  };
                }

                if (
                  rawMsg === 'Debes estar autenticado' ||
                  rawMsg === 'Debes estar autenticado.' ||
                  rawMsg === 'Usuario no autenticado' ||
                  rawMsg === 'Usuario no autenticado.' ||
                  rawMsg === 'No autenticado'
                ) {
                  return {
                    ...error,
                    extensions: {
                      code: ErrorCode.UNAUTHORIZED,
                      statusCode: 401,
                      userMessage: rawMsg,
                      timestamp: new Date().toISOString(),
                    },
                  };
                }

                if (esMensajeClienteSeguro(rawMsg)) {
                  return {
                    ...error,
                    message: rawMsg,
                    extensions: {
                      code: ErrorCode.VALIDATION_ERROR,
                      statusCode: 400,
                      userMessage: rawMsg,
                      timestamp: new Date().toISOString(),
                    },
                  };
                }

                return {
                  ...error,
                  message: 'Error interno del servidor',
                  extensions: {
                    code: ErrorCode.INTERNAL_SERVER_ERROR,
                    statusCode: 500,
                    userMessage: 'Error interno del servidor',
                    timestamp: new Date().toISOString(),
                  },
                };
              },
            );
          }
        },
      }),
    },
  ],
});

async function handleGraphQLRequest(
  request: NextRequest,
  routeContext: NextRouteContext,
): Promise<Response> {
  if (request.method === 'POST' && !validarCsrfHeader(request)) {
    return new Response(
      JSON.stringify({
        errors: [{ message: 'Solicitud no autorizada.' }],
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const requestInfo = getRequestInfo(request);
  const identifier = requestInfo.ip || 'unknown';
  const isAllowed = await checkRateLimit(
    `graphql:${identifier}`,
    RATE_LIMIT_CONFIG.GRAPHQL.maxRequests,
    RATE_LIMIT_CONFIG.GRAPHQL.windowMs,
  );

  if (!isAllowed) {
    logger.warn('Rate limit excedido en GraphQL', { ip: identifier });
    return new Response(
      JSON.stringify({
        errors: [
          {
            message: 'Demasiadas solicitudes. Por favor, intente más tarde.',
          },
        ],
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(
            Math.ceil(RATE_LIMIT_CONFIG.GRAPHQL.windowMs / 1000),
          ),
        },
      },
    );
  }

  const usuarioRl = await getCurrentUser(request);
  if (usuarioRl) {
    const userAllowed = await checkRateLimit(
      `graphql:user:${usuarioRl.idusuario}`,
      RATE_LIMIT_CONFIG.GRAPHQL.maxRequests,
      RATE_LIMIT_CONFIG.GRAPHQL.windowMs,
    );
    if (!userAllowed) {
      logger.warn('Rate limit excedido en GraphQL por usuario', {
        idusuario: usuarioRl.idusuario,
      });
      return new Response(
        JSON.stringify({
          errors: [
            {
              message: 'Demasiadas solicitudes. Por favor, intente más tarde.',
            },
          ],
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(
              Math.ceil(RATE_LIMIT_CONFIG.GRAPHQL.windowMs / 1000),
            ),
          },
        },
      );
    }

    const opName = await peekGraphqlOperationName(request);
    if (opName) {
      const opAllowed = await checkRateLimit(
        `graphql:user:${usuarioRl.idusuario}:op:${opName}`,
        RATE_LIMIT_CONFIG.GRAPHQL_OPERATION.maxRequests,
        RATE_LIMIT_CONFIG.GRAPHQL_OPERATION.windowMs,
      );
      if (!opAllowed) {
        logger.warn('Rate limit excedido en GraphQL por operación', {
          idusuario: usuarioRl.idusuario,
          operation: opName,
        });
        return new Response(
          JSON.stringify({
            errors: [
              {
                message:
                  'Demasiadas solicitudes para esta operación. Intente más tarde.',
                extensions: {
                  code: 'RATE_LIMITED',
                  operation: opName,
                },
              },
            ],
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(
                Math.ceil(RATE_LIMIT_CONFIG.GRAPHQL_OPERATION.windowMs / 1000),
              ),
            },
          },
        );
      }
    }
  }

  return quizásComprimirGraphqlResponse(
    request,
    await handleRequest(request, routeContext),
  );
}

export async function GET(
  request: NextRequest,
  routeContext: NextRouteContext,
) {
  try {
    return await handleGraphQLRequest(request, routeContext);
  } catch (error) {
    logger.error(
      'GraphQL GET Error',
      error instanceof Error ? error : undefined,
    );
    return new Response(
      JSON.stringify({
        errors: [{ message: 'Error interno del servidor' }],
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

export async function OPTIONS(
  request: NextRequest,
  routeContext: NextRouteContext,
) {
  return handleRequest(request, routeContext);
}

export async function POST(
  request: NextRequest,
  routeContext: NextRouteContext,
) {
  try {
    return await handleGraphQLRequest(request, routeContext);
  } catch (error) {
    logger.error(
      'GraphQL POST Error',
      error instanceof Error ? error : undefined,
    );

    const errorWithExtensions = error as {
      message?: string;
      extensions?: { statusCode?: number; userMessage?: string; code?: string };
    };

    if (errorWithExtensions.extensions?.statusCode) {
      const status = errorWithExtensions.extensions.statusCode;
      const safeMessage =
        status >= 500
          ? 'Error interno del servidor'
          : (errorWithExtensions.extensions.userMessage ??
            errorWithExtensions.message ??
            'Solicitud no válida');
      return new Response(
        JSON.stringify({
          errors: [
            {
              message: safeMessage,
              extensions: errorWithExtensions.extensions,
            },
          ],
        }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({
        errors: [
          {
            message: 'Error interno del servidor',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              statusCode: 500,
            },
          },
        ],
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
