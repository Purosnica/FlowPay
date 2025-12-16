/**
 * Clase base para errores de la aplicación
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error de validación (400)
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public fields?: Record<string, string[]>
  ) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

/**
 * Error de recurso no encontrado (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} no encontrado`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * Error de no autorizado (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message = "No autorizado") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

/**
 * Error de prohibido (403)
 */
export class ForbiddenError extends AppError {
  constructor(message = "Acceso prohibido") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

/**
 * Error de conflicto (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

/**
 * Convierte un error en una respuesta HTTP apropiada
 */
export function handleError(error: unknown): {
  statusCode: number;
  message: string;
  code?: string;
  fields?: Record<string, string[]>;
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
      ...(error instanceof ValidationError && { fields: error.fields }),
    };
  }

  // Error desconocido
  console.error("Error no manejado:", error);
  return {
    statusCode: 500,
    message: "Error interno del servidor",
    code: "INTERNAL_SERVER_ERROR",
  };
}





