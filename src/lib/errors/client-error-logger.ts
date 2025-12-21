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
  private recentErrors: Map<string, number> = new Map(); // Cache de errores recientes
  private debounceTime = 5000; // 5 segundos para evitar duplicados

  /**
   * Genera una clave única para un error basado en su contenido
   * Ignora campos variables como query, variables para agrupar errores similares
   */
  private getErrorKey(error: StructuredError, additionalInfo?: Record<string, unknown>): string {
    // Para errores GraphQL, agrupar por código, mensaje y statusCode solamente
    // Esto permite que múltiples queries GraphQL con el mismo error se agrupen
    const errorPart = `${error.code}-${error.message}-${error.statusCode}`;
    
    // Solo incluir campos estables del additionalInfo para el debounce
    // Ignorar campos que cambian frecuentemente (query, variables, etc.)
    let stableInfo = "";
    if (additionalInfo) {
      const stableFields: Record<string, unknown> = {};
      // Solo incluir URL base (sin query params) y método
      if (additionalInfo.url) {
        const url = String(additionalInfo.url);
        const urlBase = url.split("?")[0]; // Remover query params
        stableFields.url = urlBase;
      }
      if (additionalInfo.method) {
        stableFields.method = additionalInfo.method;
      }
      
      // Para errores GraphQL, no incluir query ni variables en la clave
      // Esto permite agrupar errores similares de diferentes queries
      // Solo incluir otros campos estables si no son query/variables
      for (const [key, value] of Object.entries(additionalInfo)) {
        if (key !== "query" && key !== "variables" && key !== "url" && key !== "method") {
          stableFields[key] = value;
        }
      }
      
      stableInfo = Object.keys(stableFields).length > 0 ? JSON.stringify(stableFields) : "";
    }
    
    return `${errorPart}-${stableInfo}`;
  }

  /**
   * Verifica si un error fue registrado recientemente
   */
  private isRecentError(key: string): boolean {
    const lastTime = this.recentErrors.get(key);
    if (!lastTime) {
      return false;
    }
    const now = Date.now();
    if (now - lastTime < this.debounceTime) {
      return true;
    }
    // Limpiar entrada antigua
    this.recentErrors.delete(key);
    return false;
  }

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

    // Verificar si este error fue registrado recientemente (debounce)
    const errorKey = this.getErrorKey(error, additionalInfo);
    if (this.isRecentError(errorKey)) {
      // Error duplicado reciente, no registrar de nuevo
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug(
          `[Error Logger] Error duplicado omitido (debounce ${this.debounceTime}ms):`,
          `${error.code} - ${error.message.substring(0, 50)}...`
        );
      }
      return;
    }

    // Registrar el tiempo actual para este error
    this.recentErrors.set(errorKey, Date.now());
    
    // Limpiar errores antiguos del cache (más de 1 minuto)
    const now = Date.now();
    for (const [key, time] of this.recentErrors.entries()) {
      if (now - time > 60000) {
        this.recentErrors.delete(key);
      }
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



