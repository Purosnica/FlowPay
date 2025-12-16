import { apiClient } from "@/lib/axios";

export interface GraphQLError {
  message: string;
  extensions?: {
    code?: string;
    [key: string]: any;
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
    public statusCode?: number
  ) {
    super(message);
    this.name = "GraphQLRequestError";
  }
}

/**
 * Cliente GraphQL usando axios con mejor manejo de errores
 */
export async function graphqlRequest<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  try {
    const response = await apiClient.post<GraphQLResponse<T>>("/api/graphql", {
      query,
      variables,
    });

    // Si hay errores en la respuesta GraphQL
    if (response.data.errors && response.data.errors.length > 0) {
      const firstError = response.data.errors[0];
      throw new GraphQLRequestError(
        firstError.message || "Error en la petición GraphQL",
        response.data.errors,
        response.status
      );
    }

    // Si no hay data, algo salió mal
    if (!response.data.data) {
      throw new GraphQLRequestError("No se recibieron datos de la respuesta");
    }

    return response.data.data;
  } catch (error: any) {
    // Si es un error de GraphQLRequestError, re-lanzarlo
    if (error instanceof GraphQLRequestError) {
      throw error;
    }

    // Si es un error de axios con respuesta
    if (error.response) {
      // Si hay errores GraphQL en la respuesta
      if (error.response.data?.errors) {
        const errors = error.response.data.errors as GraphQLError[];
        throw new GraphQLRequestError(
          errors[0]?.message || "Error en la petición GraphQL",
          errors,
          error.response.status
        );
      }
      
      // Si es un error HTTP (404, 500, etc.)
      const statusCode = error.response.status;
      const statusText = error.response.statusText;
      const message = error.response.data?.message || statusText || `Error HTTP ${statusCode}`;
      
      throw new GraphQLRequestError(
        message,
        undefined,
        statusCode
      );
    }

    // Si es un error de red
    if (error.request && !error.response) {
      throw new GraphQLRequestError(
        "Error de conexión. Por favor, verifica tu conexión a internet y que el servidor esté corriendo."
      );
    }

    // Error desconocido
    throw new GraphQLRequestError(
      error.message || "Error desconocido al realizar la petición"
    );
  }
}
