import { apiClient } from "@/lib/axios";
import { clientErrorLogger } from "@/lib/errors/client-error-logger";
import { type StructuredError, ErrorCode } from "@/lib/errors/types";
import { notificationToast } from "@/lib/notifications/notification-toast";


export interface GraphQLError {
  message: string;
  extensions?: {
    code?: string;
    userMessage?: string;
    details?: Record<string, unknown>;
    field?: string;
    statusCode?: number;
    timestamp?: string;
    [key: string]: unknown;
  };
  path?: (string | number)[];
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export class GraphQLRequestError extends Error {
  constructor(
    message: string,
    public errors?: GraphQLError[],
    public statusCode?: number,
    public structuredError?: StructuredError
  ) {
    super(message);
    this.name = "GraphQLRequestError";
  }
}

/**
 * Convierte errores GraphQL a errores estructurados
 */
function extractStructuredErrorFromGraphQL(error: GraphQLError): StructuredError {
  // Validar que el error tenga al menos un mensaje
  const message = error?.message || "Error desconocido de GraphQL";
  
  if (error?.extensions) {
    return {
      code: (error.extensions.code as ErrorCode) || ErrorCode.INTERNAL_SERVER_ERROR,
      message: message,
      userMessage: error.extensions.userMessage || message,
      details: error.extensions.details,
      field: error.extensions.field,
      statusCode: error.extensions.statusCode || 500,
      timestamp: error.extensions.timestamp || new Date().toISOString(),
      path: error.path?.join("."),
    };
  }

  return {
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    message: message,
    userMessage: message,
    statusCode: 500,
    timestamp: new Date().toISOString(),
    path: error?.path?.join("."),
  };
}

export interface GraphQLRequestOptions {
  /** Timeout en ms; por defecto usa el de apiClient (30s). */
  timeout?: number;
  /** No mostrar toast global si la petición falla por red o timeout. */
  suppressErrorToast?: boolean;
}

/**
 * Cliente GraphQL usando axios con mejor manejo de errores
 *
 * Los errores ya son manejados por el interceptor de axios,
 * pero aquí los formateamos específicamente para GraphQL.
 */
export async function graphqlRequest<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  options?: GraphQLRequestOptions,
): Promise<T> {
  try {
    const operationNameMatch = query.match(
      /\b(?:query|mutation|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)/,
    );
    const operationName = operationNameMatch?.[1];

    const response = await apiClient.post<GraphQLResponse<T>>(
      '/api/graphql',
      {
        query,
        variables,
        ...(operationName ? { operationName } : {}),
      },
      {
        ...(options?.timeout ? { timeout: options.timeout } : {}),
        ...(options?.suppressErrorToast
          ? { suppressErrorToast: true }
          : {}),
      },
    );

    // Si hay errores en la respuesta GraphQL (suele ser HTTP 200)
    if (response.data.errors && response.data.errors.length > 0) {
      const firstError = response.data.errors[0];
      const structuredError = extractStructuredErrorFromGraphQL(firstError);
      const userMessage =
        structuredError.userMessage ||
        firstError?.message ||
        "Ocurrió un error inesperado. Por favor, intente nuevamente.";

      if (typeof window !== "undefined" && response.status === 200) {
        clientErrorLogger.log(structuredError, {
          query: query.substring(0, 100),
          variables: JSON.stringify(variables),
        });
        if (!options?.suppressErrorToast) {
          notificationToast.error(userMessage);
        }
      }

      throw new GraphQLRequestError(
        userMessage,
        response.data.errors,
        structuredError.statusCode,
        structuredError,
      );
    }

    // Si no hay data, algo salió mal
    if (!response.data.data) {
      const structuredError: StructuredError = {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: "No se recibieron datos de la respuesta",
        userMessage:
          "No se recibieron datos de la respuesta. Por favor, intente nuevamente.",
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };

      if (typeof window !== "undefined" && response.status === 200) {
        clientErrorLogger.log(structuredError);
        if (!options?.suppressErrorToast) {
          notificationToast.error(structuredError.userMessage);
        }
      }

      throw new GraphQLRequestError(
        structuredError.userMessage,
        undefined,
        structuredError.statusCode,
        structuredError,
      );
    }

    return response.data.data;
  } catch (error) {
    // Si es un error de GraphQLRequestError, re-lanzarlo
    if (error instanceof GraphQLRequestError) {
      throw error;
    }

    // Si es un error de axios, ya fue manejado por el interceptor
    // (registrado y notificado al usuario)
    // Solo re-lanzamos para que los hooks puedan manejarlo
    // No registramos aquí porque el interceptor ya lo hizo
    throw error;
  }
}
