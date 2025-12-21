/**
 * MANEJO CENTRALIZADO DE ERRORES PARA GRAPHQL
 * 
 * Este módulo captura y formatea errores de:
 * - Prisma (constraints, validaciones, conexión)
 * - Zod (validaciones de esquemas)
 * - Errores de negocio
 * - Errores genéricos
 */

import { GraphQLError } from "graphql";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ErrorCode, StructuredError } from "./types";

/**
 * Convierte un error de Prisma a un error estructurado
 */
function handlePrismaError(error: any): StructuredError {
  // Error de constraint único
  if (error.code === "P2002") {
    const target = error.meta?.target as string[] | undefined;
    const field = target?.[0] || "campo";
    return {
      code: ErrorCode.PRISMA_UNIQUE_CONSTRAINT,
      message: error.message,
      userMessage: `El ${field} ya existe. Por favor, use un valor diferente.`,
      details: {
        field,
        target: error.meta?.target,
      },
      statusCode: 409, // Conflict
      timestamp: new Date().toISOString(),
    };
  }

  // Error de foreign key constraint
  if (error.code === "P2003") {
    const field = error.meta?.field_name || "relación";
    return {
      code: ErrorCode.PRISMA_FOREIGN_KEY_CONSTRAINT,
      message: error.message,
      userMessage: `No se puede realizar esta operación porque hay una relación con ${field} que no existe.`,
      details: {
        field,
      },
      statusCode: 400,
      timestamp: new Date().toISOString(),
    };
  }

  // Error de registro no encontrado
  if (error.code === "P2025") {
    return {
      code: ErrorCode.PRISMA_NOT_FOUND,
      message: error.message,
      userMessage: "El registro solicitado no existe o ha sido eliminado.",
      statusCode: 404,
      timestamp: new Date().toISOString(),
    };
  }

  // Error de validación de Prisma
  if (error.code?.startsWith("P2")) {
    return {
      code: ErrorCode.PRISMA_VALIDATION,
      message: error.message,
      userMessage: "Los datos proporcionados no son válidos. Por favor, verifique la información.",
      details: {
        code: error.code,
        meta: error.meta,
      },
      statusCode: 400,
      timestamp: new Date().toISOString(),
    };
  }

  // Error de conexión a la base de datos
  if (error.code === "P1001" || error.code === "P1002") {
    return {
      code: ErrorCode.PRISMA_CONNECTION,
      message: error.message,
      userMessage: "No se pudo conectar con la base de datos. Por favor, intente nuevamente más tarde.",
      statusCode: 503, // Service Unavailable
      timestamp: new Date().toISOString(),
    };
  }

  // Error genérico de Prisma
  return {
    code: ErrorCode.PRISMA_VALIDATION,
    message: error.message,
    userMessage: "Ocurrió un error al procesar la solicitud en la base de datos.",
    details: {
      code: error.code,
    },
    statusCode: 500,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Convierte un error de Zod a un error estructurado
 */
function handleZodError(error: ZodError): StructuredError {
  const firstIssue = error.issues[0];
  const field = firstIssue.path.join(".");
  
  // Construir mensaje amigable
  let userMessage = "Los datos proporcionados no son válidos.";
  
  if (firstIssue.code === "invalid_type") {
    const issue = firstIssue as { expected: string; received?: string };
    userMessage = `El campo ${field} debe ser de tipo ${issue.expected}${issue.received ? `, pero se recibió ${issue.received}` : ""}.`;
  } else if (firstIssue.code === "too_small") {
    const issue = firstIssue as { minimum: number; type?: string };
    userMessage = `El campo ${field} debe tener al menos ${issue.minimum} ${issue.type === "string" ? "caracteres" : "elementos"}.`;
  } else if (firstIssue.code === "too_big") {
    const issue = firstIssue as { maximum: number; type?: string };
    userMessage = `El campo ${field} no puede tener más de ${issue.maximum} ${issue.type === "string" ? "caracteres" : "elementos"}.`;
  } else if (firstIssue.code === "invalid_format") {
    const issue = firstIssue as { validation?: string };
    if (issue.validation === "email") {
      userMessage = `El campo ${field} debe ser un email válido.`;
    } else if (issue.validation === "url") {
      userMessage = `El campo ${field} debe ser una URL válida.`;
    }
  } else if (firstIssue.message) {
    userMessage = firstIssue.message;
  }

  return {
    code: ErrorCode.ZOD_VALIDATION,
    message: error.message,
    userMessage,
    field,
    details: {
      issues: error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
        code: issue.code,
      })),
    },
    statusCode: 400,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Convierte un error genérico a un error estructurado
 */
function handleGenericError(error: any, path?: string): StructuredError {
  // Si ya es un error estructurado, retornarlo
  if (error.code && error.userMessage) {
    return error as StructuredError;
  }

    // Si es un Error estándar
    if (error instanceof Error) {
      // Errores de negocio (mensajes claros)
      if (
        error.message.includes("No tiene permisos") || 
        error.message.includes("No tienes permiso") ||
        error.message.includes("ADMINISTRADOR") ||
        error.message.includes("permiso para realizar")
      ) {
        return {
          code: ErrorCode.FORBIDDEN,
          message: error.message,
          userMessage: error.message.includes("No tienes permiso") 
            ? error.message 
            : "No tiene permisos para realizar esta acción.",
          statusCode: 403,
          timestamp: new Date().toISOString(),
          path,
        };
      }

      // Errores de autenticación
      if (
        error.message.includes("Debes estar autenticado") ||
        error.message.includes("No autenticado") ||
        error.message.includes("inicia sesión")
      ) {
        return {
          code: ErrorCode.UNAUTHORIZED,
          message: error.message,
          userMessage: error.message,
          statusCode: 401,
          timestamp: new Date().toISOString(),
          path,
        };
      }

    if (error.message.includes("no encontrado") || error.message.includes("no existe")) {
      return {
        code: ErrorCode.PRISMA_NOT_FOUND,
        message: error.message,
        userMessage: error.message,
        statusCode: 404,
        timestamp: new Date().toISOString(),
        path,
      };
    }

    // Error genérico
    return {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: error.message,
      userMessage: process.env.NODE_ENV === "production" 
        ? "Ocurrió un error inesperado. Por favor, intente nuevamente."
        : error.message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  // Error desconocido
  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: String(error),
    userMessage: "Ocurrió un error inesperado. Por favor, intente nuevamente.",
    statusCode: 500,
    timestamp: new Date().toISOString(),
    path,
  };
}

/**
 * Función principal para formatear errores de GraphQL
 */
export function formatGraphQLError(error: any, path?: string): GraphQLError {
  let structuredError: StructuredError;

  // Error de Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    structuredError = handlePrismaError(error);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    structuredError = {
      code: ErrorCode.PRISMA_VALIDATION,
      message: error.message,
      userMessage: "Los datos proporcionados no son válidos para la base de datos.",
      statusCode: 400,
      timestamp: new Date().toISOString(),
      path,
    };
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    structuredError = {
      code: ErrorCode.PRISMA_CONNECTION,
      message: error.message,
      userMessage: "Error de conexión con la base de datos. Por favor, contacte al administrador.",
      statusCode: 503,
      timestamp: new Date().toISOString(),
      path,
    };
  }
  // Error de Zod
  else if (error instanceof ZodError) {
    structuredError = handleZodError(error);
  }
  // Error genérico
  else {
    structuredError = handleGenericError(error, path);
  }

  // Crear GraphQLError con el error estructurado
  return new GraphQLError(structuredError.userMessage, {
    extensions: {
      code: structuredError.code,
      userMessage: structuredError.userMessage,
      details: structuredError.details,
      field: structuredError.field,
      statusCode: structuredError.statusCode,
      timestamp: structuredError.timestamp,
      path: structuredError.path || path,
    },
    originalError: error,
  });
}

/**
 * Middleware para capturar errores en resolvers de GraphQL
 */
export function graphqlErrorHandler(error: any, path?: string): GraphQLError {
  return formatGraphQLError(error, path);
}



