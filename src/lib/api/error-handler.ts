/**
 * MANEJO GLOBAL DE ERRORES PARA API ROUTES
 * 
 * Este módulo proporciona funciones para manejar errores de manera consistente
 * y retornar respuestas apropiadas al frontend
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ServicioError, ErrorCode } from "@/lib/services/error-types";
import { logger } from "@/lib/utils/logger";

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  detalles?: Record<string, any>;
}

/**
 * Maneja errores y retorna respuesta apropiada
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  logger.error("API Error", error instanceof Error ? error : undefined);

  // Error de servicio personalizado
  if (error instanceof ServicioError) {
    const statusCode = getStatusCodeForErrorCode(error.code);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        detalles: error.detalles,
      },
      { status: statusCode }
    );
  }

  // Error de Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  // Error de validación de Prisma
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: "Error de validación de datos",
        code: "VALIDACION_ERROR",
        detalles: { message: error.message },
      },
      { status: 400 }
    );
  }

  // Error de autenticación (mensaje contiene "No autenticado" o "Token")
  const errorMessage =
    error instanceof Error ? error.message : "Error desconocido";
  
  if (
    error instanceof Error &&
    (error.message.includes("No autenticado") ||
      error.message.includes("Token") ||
      error.message.includes("autenticado"))
  ) {
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  // Error genérico
  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}

/**
 * Maneja errores específicos de Prisma
 */
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError
): NextResponse<ErrorResponse> {
  switch (error.code) {
    case "P2002":
      // Unique constraint violation
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un registro con estos datos",
          code: "DUPLICADO_ERROR",
          detalles: { campo: error.meta?.target },
        },
        { status: 409 }
      );

    case "P2025":
      // Record not found
      return NextResponse.json(
        {
          success: false,
          error: "Registro no encontrado",
          code: "NO_ENCONTRADO",
        },
        { status: 404 }
      );

    case "P2003":
      // Foreign key constraint violation
      return NextResponse.json(
        {
          success: false,
          error: "Error de integridad referencial",
          code: "INTEGRIDAD_ERROR",
        },
        { status: 400 }
      );

    default:
      return NextResponse.json(
        {
          success: false,
          error: "Error de base de datos",
          code: "DATABASE_ERROR",
          detalles: { code: error.code },
        },
        { status: 500 }
      );
  }
}

/**
 * Obtiene el código de estado HTTP apropiado para un código de error
 */
function getStatusCodeForErrorCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.VALIDACION_ERROR:
    case ErrorCode.MONTO_EXCEDE_SALDO:
    case ErrorCode.CUOTAS_DUPLICADAS:
      return 400;

    case ErrorCode.PRESTAMO_NO_ENCONTRADO:
    case ErrorCode.CUOTA_NO_ENCONTRADA:
    case ErrorCode.ACUERDO_NO_ENCONTRADO:
      return 404;

    case ErrorCode.CONCURRENCIA_ERROR:
    case ErrorCode.RECURSO_BLOQUEADO:
      return 409;

    case ErrorCode.PERMISO_DENEGADO:
    case ErrorCode.ASIGNACION_INVALIDA:
      return 403;

    case ErrorCode.DATABASE_ERROR:
    case ErrorCode.TRANSACCION_ERROR:
      return 500;

    default:
      return 400;
  }
}

/**
 * Wrapper para manejar errores en handlers de API
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ErrorResponse>> {
  return handler().catch(handleApiError);
}



