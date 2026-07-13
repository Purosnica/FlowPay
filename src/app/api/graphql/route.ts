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
import { useRequireAuthPlugin } from '@/lib/graphql/plugins/require-auth-plugin';

interface FormattableGraphQLError {
  message: string;
  originalError?: Error;
  extensions?: Record<string, unknown>;
}

const introspectionPlugins =
  process.env.NODE_ENV === 'production'
    ? // eslint-disable-next-line react-hooks/rules-of-hooks -- plugin GraphQL Yoga, no React hook
      [useValidationRule(NoSchemaIntrospectionCustomRule)]
    : [];

const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  context: async ({ request }) => {
    try {
      const usuario = await getCurrentUser(request as NextRequest);
      return {
        prisma,
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
        usuario: null,
      };
    }
  },
  maskedErrors: process.env.NODE_ENV === 'production',
  graphiql: process.env.NODE_ENV === 'development',
  plugins: [
    ...introspectionPlugins,
    // eslint-disable-next-line react-hooks/rules-of-hooks -- plugin GraphQL Yoga, no React hook
    useRequireAuthPlugin(),
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

                if (error.extensions) {
                  return error;
                }

                if (error.message.includes('No tienes permiso')) {
                  return {
                    ...error,
                    extensions: {
                      code: ErrorCode.FORBIDDEN,
                      statusCode: 403,
                      userMessage: error.message,
                      timestamp: new Date().toISOString(),
                    },
                  };
                }

                if (
                  error.message.includes('Debes estar autenticado') ||
                  error.message.includes('autenticado')
                ) {
                  return {
                    ...error,
                    extensions: {
                      code: ErrorCode.UNAUTHORIZED,
                      statusCode: 401,
                      userMessage: error.message,
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

async function handleGraphQLRequest(request: NextRequest): Promise<Response> {
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

  return handleRequest(request, {} as Record<string, unknown>);
}

export async function GET(request: NextRequest) {
  try {
    return await handleGraphQLRequest(request);
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

export async function POST(request: NextRequest) {
  try {
    return await handleGraphQLRequest(request);
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
