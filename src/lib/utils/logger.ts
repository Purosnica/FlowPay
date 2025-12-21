/**
 * LOGGER ESTRUCTURADO
 * 
 * Reemplaza console.log/error/warn con un logger estructurado
 * que filtra información sensible y permite diferentes niveles de log.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  /**
   * Filtra información sensible de los datos antes de loguear
   */
  private sanitize(data: unknown): unknown {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    const sensitiveKeys = [
      "password",
      "passwordHash",
      "salt",
      "token",
      "jwt",
      "secret",
      "apiKey",
      "apikey",
      "authorization",
      "cookie",
      "creditCard",
      "creditcard",
      "ssn",
      "socialSecurity",
    ];

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = this.sanitize(value);
      }
    }

    return sanitized;
  }

  /**
   * Formatea un log entry
   */
  private formatLog(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: context ? this.sanitize(context) as Record<string, unknown> : undefined,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: this.isDevelopment ? error.stack : undefined,
          }
        : undefined,
    };
  }

  /**
   * Log de debug (solo en desarrollo)
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.isDevelopment) return;

    const logEntry = this.formatLog("debug", message, context);
    console.debug(`[DEBUG] ${logEntry.timestamp} - ${message}`, context ? this.sanitize(context) : "");
  }

  /**
   * Log de información
   */
  info(message: string, context?: Record<string, unknown>): void {
    const logEntry = this.formatLog("info", message, context);
    if (this.isDevelopment) {
      console.info(`[INFO] ${logEntry.timestamp} - ${message}`, context ? this.sanitize(context) : "");
    }
    // En producción, podrías enviar a un servicio de logging
  }

  /**
   * Log de advertencia
   */
  warn(message: string, context?: Record<string, unknown>): void {
    const logEntry = this.formatLog("warn", message, context);
    console.warn(`[WARN] ${logEntry.timestamp} - ${message}`, context ? this.sanitize(context) : "");
  }

  /**
   * Log de error
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const logEntry = this.formatLog("error", message, context, error);
    
    if (this.isDevelopment) {
      console.error(`[ERROR] ${logEntry.timestamp} - ${message}`, {
        error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
        context: context ? this.sanitize(context) : undefined,
      });
    } else {
      // En producción, solo loguear información esencial
      console.error(`[ERROR] ${logEntry.timestamp} - ${message}`, {
        error: error ? { name: error.name, message: error.message } : undefined,
        context: context ? this.sanitize(context) : undefined,
      });
    }
  }
}

export const logger = new Logger();

