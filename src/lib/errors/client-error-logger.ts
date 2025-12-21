/**
 * LOGGER DE ERRORES EN CLIENTE
 * 
 * Registra errores del cliente para análisis y debugging.
 * Los errores se pueden enviar a un servicio externo o almacenarse localmente.
 */

import { StructuredError, ErrorCode, ErrorDetails } from "./types";

export interface ErrorLog {
  error: StructuredError;
  userAgent: string;
  url: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

class ClientErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 100; // Máximo de logs en memoria

  /**
   * Registrar un error
   */
  log(error: StructuredError, additionalInfo?: Record<string, unknown>) {
    // Validar que el error tenga la estructura mínima requerida
    if (!error || typeof error !== "object") {
      console.warn("[Error Logger] Error inválido recibido (no es un objeto):", error);
      // Crear un error por defecto si el recibido es inválido
      const defaultError: StructuredError = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: "Error desconocido - objeto inválido recibido",
        userMessage: "Ocurrió un error inesperado",
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };
      error = defaultError;
    } else if (!error.code || !error.message) {
      console.warn("[Error Logger] Error inválido recibido (falta code o message):", {
        error,
        hasCode: !!error.code,
        hasMessage: !!error.message,
        errorKeys: Object.keys(error),
        errorType: typeof error,
        errorStringified: JSON.stringify(error),
      });
      // Crear un error por defecto si el recibido es inválido
      const defaultError: StructuredError = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: error.message || String(error) || "Error desconocido - falta código o mensaje",
        userMessage: error.userMessage || "Ocurrió un error inesperado",
        statusCode: error.statusCode || 500,
        timestamp: error.timestamp || new Date().toISOString(),
      };
      error = defaultError;
    }
    
    // Validación adicional: asegurar que el error procesado tenga al menos code y message
    if (!error.code || !error.message) {
      console.error("[Error Logger] Error crítico: El error procesado sigue siendo inválido después de la validación:", {
        originalError: error,
        code: error.code,
        message: error.message,
      });
      // Forzar un error válido
      error = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: "Error crítico en el logger - error inválido después de validación",
        userMessage: "Ocurrió un error inesperado",
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };
    }

    // Construir errorLog sin sobrescribir propiedades principales con additionalInfo
    // Asegurar que el objeto error siempre tenga las propiedades necesarias
    const errorObject: StructuredError = {
      code: error.code || ErrorCode.UNKNOWN_ERROR,
      message: error.message || "Error sin mensaje",
      userMessage: error.userMessage || error.message || "Error desconocido",
      statusCode: error.statusCode || 500,
      timestamp: error.timestamp || new Date().toISOString(),
      ...(error.details && { details: error.details }),
      ...(error.field && { field: error.field }),
      ...(error.path && { path: error.path }),
    };

    const errorLog: ErrorLog & Record<string, unknown> = {
      error: errorObject,
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
      url: typeof window !== "undefined" ? window.location.href : "unknown",
      timestamp: new Date().toISOString(),
    };
    
    // Agregar additionalInfo de forma segura sin sobrescribir propiedades principales
    if (additionalInfo) {
      // Excluir propiedades principales para evitar sobrescritura
      const { error: _, userAgent: __, url: ___, timestamp: ____, ...safeAdditionalInfo } = additionalInfo;
      Object.assign(errorLog, safeAdditionalInfo);
    }

    // Agregar a logs en memoria
    this.logs.push(errorLog);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remover el más antiguo
    }

    // Log en consola (solo en desarrollo)
    if (process.env.NODE_ENV === "development") {
      // Extraer información adicional sin incluir las propiedades principales
      const { error, userAgent, url, timestamp, userId, sessionId, ...restAdditionalInfo } = errorLog;
      
      // Validar que error tenga las propiedades necesarias
      const errorInfo = error && typeof error === "object" && error.code && error.message
        ? {
            code: error.code,
            message: error.message,
            userMessage: error.userMessage,
            statusCode: error.statusCode,
            timestamp: error.timestamp,
            details: error.details,
            field: error.field,
            path: error.path,
          }
        : {
            code: "UNKNOWN_ERROR",
            message: "Error object is empty or invalid",
            userMessage: "Error desconocido",
            statusCode: 500,
            timestamp: new Date().toISOString(),
          };
      
      console.error("[Error Logger] Error registrado:", {
        error: errorInfo,
        context: {
          url,
          userAgent,
          timestamp,
          userId,
          sessionId,
        },
        ...(Object.keys(restAdditionalInfo).length > 0 && { additionalInfo: restAdditionalInfo }),
      });
    }

    // En producción, podrías enviar a un servicio externo
    if (process.env.NODE_ENV === "production") {
      this.sendToExternalService(errorLog).catch((err) => {
        console.error("Error al enviar log a servicio externo:", err);
      });
    }
  }

  /**
   * Obtener logs almacenados
   */
  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  /**
   * Limpiar logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Enviar error a servicio externo (ej: Sentry, LogRocket, etc.)
   */
  private async sendToExternalService(errorLog: ErrorLog): Promise<void> {
    // TODO: Implementar envío a servicio externo si es necesario
    // Ejemplo:
    // await fetch('/api/errors', {
    //   method: 'POST',
    //   body: JSON.stringify(errorLog),
    // });
  }
}

export const clientErrorLogger = new ClientErrorLogger();



