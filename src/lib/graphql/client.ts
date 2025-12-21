import { apiClient } from "@/lib/axios";
import { clientErrorLogger } from "@/lib/errors/client-error-logger";
import { StructuredError, ErrorCode } from "@/lib/errors/types";

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

/**
 * Cliente GraphQL usando axios con mejor manejo de errores
 * 
 * Los errores ya son manejados por el interceptor de axios,
 * pero aquí los formateamos específicamente para GraphQL.
 */
export async function graphqlRequest<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  try {
    const response = await apiClient.post<GraphQLResponse<T>>("/api/graphql", {
      query,
      variables,
    });

    // Si hay errores en la respuesta GraphQL
    if (response.data.errors && response.data.errors.length > 0) {
      const firstError = response.data.errors[0];
      const structuredError = extractStructuredErrorFromGraphQL(firstError);

      // Validar que el error estructurado sea válido antes de registrarlo
      // Solo registrar errores GraphQL (no errores HTTP, esos ya los registró el interceptor)
      if (structuredError && structuredError.code && structuredError.message) {
        // Registrar error solo si es un error GraphQL (no HTTP)
        // Los errores HTTP (4xx, 5xx) ya fueron registrados por el interceptor de axios
        // Solo registramos errores GraphQL que vienen en respuestas HTTP 200
        if (typeof window !== "undefined" && response.status === 200) {
          clientErrorLogger.log(structuredError, {
            query: query.substring(0, 100), // Solo primeros 100 caracteres
            variables: JSON.stringify(variables),
          });
        }
      } else {
        // Si el error no es válido, crear uno por defecto y registrarlo
        const defaultError: StructuredError = {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: firstError?.message || "Error desconocido de GraphQL",
          userMessage: firstError?.message || "Ocurrió un error inesperado. Por favor, intente nuevamente.",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        };
        if (typeof window !== "undefined" && response.status === 200) {
          clientErrorLogger.log(defaultError, {
            query: query.substring(0, 100),
            variables: JSON.stringify(variables),
          });
        }
      }

      throw new GraphQLRequestError(
        structuredError.userMessage,
        response.data.errors,
        structuredError.statusCode,
        structuredError
      );
    }

    // Si no hay data, algo salió mal
    if (!response.data.data) {
      const structuredError: StructuredError = {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: "No se recibieron datos de la respuesta",
        userMessage: "No se recibieron datos de la respuesta. Por favor, intente nuevamente.",
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };

      // Solo registrar si es HTTP 200 (errores HTTP ya fueron registrados por el interceptor)
      if (typeof window !== "undefined" && response.status === 200) {
        clientErrorLogger.log(structuredError);
      }

      throw new GraphQLRequestError(
        structuredError.userMessage,
        undefined,
        structuredError.statusCode,
        structuredError
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
