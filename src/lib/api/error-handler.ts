/**
 * Contrato estable de errores API (I060).
 * Sin stack traces ni mensajes internos en 5xx.
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ServicioError, ErrorCode } from '@/lib/services/error-types';
import {
  GraphQLPermissionError,
  GraphQLAuthenticationError,
  GraphQLValidationError,
} from '@/lib/errors/graphql-errors';
import {
  esMensajeClienteSeguro,
  mensajeClienteSeguro,
} from '@/lib/errors/client-safe-message';
import { logger } from '@/lib/utils/logger';

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  detalles?: Record<string, unknown>;
}

const SAFE_5XX_MESSAGE = 'Error interno del servidor';

/**
 * Maneja errores y retorna respuesta apropiada
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  const err = error instanceof Error ? error : undefined;
  logger.error('API Error', err);
  if (err) {
    void import('@/lib/errors/sentry-server').then(
      ({ captureServerException }) =>
        captureServerException(err, { source: 'handleApiError' }),
    );
  }

  if (error instanceof ServicioError) {
    const statusCode = getStatusCodeForErrorCode(error.code);
    const isServer = statusCode >= 500;
    return NextResponse.json(
      {
        success: false,
        error: isServer ? SAFE_5XX_MESSAGE : error.message,
        code: error.code,
        ...(isServer
          ? {}
          : error.detalles
            ? { detalles: sanitizeDetalles(error.detalles) }
            : {}),
      },
      { status: statusCode },
    );
  }

  if (error instanceof GraphQLPermissionError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: 'PERMISO_DENEGADO',
      },
      { status: 403 },
    );
  }

  if (error instanceof GraphQLValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: 'VALIDACION_ERROR',
      },
      { status: 400 },
    );
  }

  if (error instanceof GraphQLAuthenticationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: 'UNAUTHORIZED',
      },
      { status: 401 },
    );
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return NextResponse.json(
      {
        success: false,
        error: firstIssue?.message || 'Datos de entrada inválidos',
        code: 'VALIDACION_ERROR',
        detalles: {
          path: firstIssue?.path?.join('.') || undefined,
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Error de validación de datos',
        code: 'VALIDACION_ERROR',
      },
      { status: 400 },
    );
  }

  if (error instanceof Error) {
    const msg = error.message.trim();
    if (
      msg === 'No autenticado' ||
      msg === 'Debes estar autenticado' ||
      msg === 'Debes estar autenticado.' ||
      msg === 'Usuario no autenticado' ||
      msg === 'Usuario no autenticado.'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autenticado',
          code: 'UNAUTHORIZED',
        },
        { status: 401 },
      );
    }

    if (esMensajeClienteSeguro(msg)) {
      return NextResponse.json(
        {
          success: false,
          error: mensajeClienteSeguro(error, msg),
          code: 'VALIDACION_ERROR',
        },
        { status: 400 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      error: SAFE_5XX_MESSAGE,
      code: 'INTERNAL_ERROR',
    },
    { status: 500 },
  );
}

function sanitizeDetalles(
  detalles: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detalles)) {
    if (
      key.toLowerCase().includes('stack') ||
      key.toLowerCase().includes('sql') ||
      key.toLowerCase().includes('password')
    ) {
      continue;
    }
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      out[key] = value;
    } else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      out[key] = value;
    }
  }
  return out;
}

function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError,
): NextResponse<ApiErrorResponse> {
  switch (error.code) {
    case 'P2002':
      return NextResponse.json(
        {
          success: false,
          error: 'Ya existe un registro con estos datos',
          code: 'DUPLICADO_ERROR',
          detalles: { campo: error.meta?.target },
        },
        { status: 409 },
      );

    case 'P2025':
      return NextResponse.json(
        {
          success: false,
          error: 'Registro no encontrado',
          code: 'NO_ENCONTRADO',
        },
        { status: 404 },
      );

    case 'P2003':
      return NextResponse.json(
        {
          success: false,
          error: 'Error de integridad referencial',
          code: 'INTEGRIDAD_ERROR',
        },
        { status: 400 },
      );

    default:
      return NextResponse.json(
        {
          success: false,
          error: 'Error de base de datos',
          code: 'DATABASE_ERROR',
        },
        { status: 500 },
      );
  }
}

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
  handler: () => Promise<NextResponse<T>>,
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch(handleApiError);
}
