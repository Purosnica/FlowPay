import axios, { AxiosError } from "axios";
import { env } from "@/lib/env";
import { notificationService } from "@/lib/notifications/notification-service";
import { clientErrorLogger } from "@/lib/errors/client-error-logger";
import { ErrorCode, StructuredError } from "@/lib/errors/types";

// Instancia de axios configurada para la aplicación
export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 segundos
  withCredentials: true, // Incluir cookies en las peticiones
});

/**
 * Extrae mensaje de error estructurado de una respuesta
 */
function extractErrorFromResponse(error: AxiosError): StructuredError {
  const response = error.response;

  if (response?.data) {
    const data = response.data as Record<string, unknown>;
    // Si la respuesta tiene un error estructurado
    if (data.error && typeof data.error === "object") {
      const errorObj = data.error as Record<string, unknown>;
      // Validar que tenga las propiedades mínimas
      if (errorObj.code && errorObj.message) {
        return {
          code: (errorObj.code as ErrorCode) || ErrorCode.INTERNAL_SERVER_ERROR,
          message: (errorObj.message as string) || "Error desconocido",
          userMessage: (errorObj.userMessage as string) || (errorObj.message as string) || "Error desconocido",
          details: errorObj.details as Record<string, unknown> | undefined,
          field: errorObj.field as string | undefined,
          statusCode: (errorObj.statusCode as number) || response.status || 500,
          timestamp: (errorObj.timestamp as string) || new Date().toISOString(),
          path: errorObj.path as string | undefined,
        };
      }
    }

    // Si tiene mensaje directo
    if (data.message) {
      return {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: data.message as string,
        userMessage: data.message as string,
        statusCode: response.status || 500,
        timestamp: new Date().toISOString(),
      };
    }

    // Si tiene errores GraphQL
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const firstError = data.errors[0] as Record<string, unknown>;
      const message = (firstError?.message as string) || "Error desconocido de GraphQL";
      
      if (firstError?.extensions) {
        const extensions = firstError.extensions as Record<string, unknown>;
        return {
          code: (extensions.code as ErrorCode) || ErrorCode.INTERNAL_SERVER_ERROR,
          message: message,
          userMessage: (extensions.userMessage as string) || message,
          details: extensions.details as Record<string, unknown> | undefined,
          field: extensions.field as string | undefined,
          statusCode: (extensions.statusCode as number) || response.status || 500,
          timestamp: (extensions.timestamp as string) || new Date().toISOString(),
          path: (firstError.path as string[] | undefined)?.join("."),
        };
      }
      
      // Si no tiene extensions pero tiene mensaje
      return {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: message,
        userMessage: message,
        statusCode: response.status || 500,
        timestamp: new Date().toISOString(),
        path: (firstError.path as string[] | undefined)?.join("."),
      };
    }
  }

  // Error HTTP genérico
  const statusCode = response?.status || 500;
  let code = ErrorCode.INTERNAL_SERVER_ERROR;
  let userMessage = "Ocurrió un error al procesar la solicitud.";

  if (statusCode === 401) {
    code = ErrorCode.UNAUTHORIZED;
    userMessage = "No está autorizado para realizar esta acción.";
  } else if (statusCode === 403) {
    code = ErrorCode.FORBIDDEN;
    userMessage = "No tiene permisos para realizar esta acción.";
  } else if (statusCode === 404) {
    code = ErrorCode.PRISMA_NOT_FOUND;
    userMessage = "El recurso solicitado no existe.";
  } else if (statusCode >= 500) {
    code = ErrorCode.INTERNAL_SERVER_ERROR;
    userMessage = "Error interno del servidor. Por favor, intente nuevamente más tarde.";
  }

  return {
    code,
    message: error.message || "Error desconocido",
    userMessage,
    statusCode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Función para obtener el token de autenticación desde el cliente
 * Se actualiza desde el contexto de autenticación
 */
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// Interceptor para requests
apiClient.interceptors.request.use(
  (config) => {
    // Agregar token de autenticación si está disponible
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[Axios] Token agregado al header Authorization");
      }
    } else {
      if (process.env.NODE_ENV === "development" && config.url?.includes("graphql")) {
        // eslint-disable-next-line no-console
        console.warn("[Axios] No hay token disponible para petición GraphQL");
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Solo procesar errores en el cliente (no en SSR)
    if (typeof window !== "undefined") {
      let structuredError: StructuredError;

      if (error.response) {
        // El servidor respondió con un código de estado fuera del rango 2xx
        structuredError = extractErrorFromResponse(error);
      } else if (error.request) {
        // La petición fue hecha pero no se recibió respuesta
        structuredError = {
          code: ErrorCode.NETWORK_ERROR,
          message: "Network Error",
          userMessage: "Error de conexión. Por favor, verifique su conexión a internet y que el servidor esté corriendo.",
          statusCode: 0,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Algo pasó al configurar la petición
        structuredError = {
          code: ErrorCode.UNKNOWN_ERROR,
          message: error.message || "Error desconocido",
          userMessage: "Ocurrió un error inesperado. Por favor, intente nuevamente.",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        };
      }

      // No registrar ni mostrar errores 401 en /api/auth/me (es un caso esperado cuando no hay token)
      const isAuthCheck = error.config?.url?.includes("/api/auth/me");
      const isExpected401 = structuredError.statusCode === 401 && isAuthCheck;

      // Validar y registrar error solo si es válido y no es un 401 esperado
      if (structuredError && structuredError.code && structuredError.message && !isExpected401) {
        clientErrorLogger.log(structuredError, {
          url: error.config?.url,
          method: error.config?.method,
        });
      } else if (!isExpected401) {
        // Si el error no es válido y no es un 401 esperado, crear uno por defecto
        const defaultError: StructuredError = {
          code: ErrorCode.UNKNOWN_ERROR,
          message: error.message || "Error desconocido",
          userMessage: "Ocurrió un error inesperado. Por favor, intente nuevamente.",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        };
        clientErrorLogger.log(defaultError, {
          url: error.config?.url,
          method: error.config?.method,
        });
      }

      // Mostrar notificación solo si no es un 401 esperado
      if (!isExpected401) {
        notificationService.error(
          "Error",
          structuredError.userMessage
        );
      }
    }

    return Promise.reject(error);
  }
);






