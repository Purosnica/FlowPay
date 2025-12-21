/**
 * TIPOS DE ERRORES PARA SERVICIOS
 * 
 * Define tipos de errores específicos del dominio para mejor manejo
 */

export enum ErrorCode {
  // Errores de validación
  VALIDACION_ERROR = "VALIDACION_ERROR",
  PRESTAMO_NO_ENCONTRADO = "PRESTAMO_NO_ENCONTRADO",
  CUOTA_NO_ENCONTRADA = "CUOTA_NO_ENCONTRADA",
  ACUERDO_NO_ENCONTRADO = "ACUERDO_NO_ENCONTRADO",
  
  // Errores de negocio
  MONTO_EXCEDE_SALDO = "MONTO_EXCEDE_SALDO",
  ACUERDO_NO_ACTIVO = "ACUERDO_NO_ACTIVO",
  ACUERDO_VENCIDO = "ACUERDO_VENCIDO",
  PRESTAMO_YA_CASTIGADO = "PRESTAMO_YA_CASTIGADO",
  PRESTAMO_YA_PAGADO = "PRESTAMO_YA_PAGADO",
  CUOTAS_DUPLICADAS = "CUOTAS_DUPLICADAS",
  
  // Errores de concurrencia
  CONCURRENCIA_ERROR = "CONCURRENCIA_ERROR",
  RECURSO_BLOQUEADO = "RECURSO_BLOQUEADO",
  
  // Errores de permisos
  PERMISO_DENEGADO = "PERMISO_DENEGADO",
  ASIGNACION_INVALIDA = "ASIGNACION_INVALIDA",
  
  // Errores de base de datos
  DATABASE_ERROR = "DATABASE_ERROR",
  TRANSACCION_ERROR = "TRANSACCION_ERROR",
}

export class ServicioError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public detalles?: Record<string, any>
  ) {
    super(message);
    this.name = "ServicioError";
  }
}

/**
 * Helper para crear errores de validación
 */
export function errorValidacion(
  mensaje: string,
  detalles?: Record<string, any>
): ServicioError {
  return new ServicioError(ErrorCode.VALIDACION_ERROR, mensaje, detalles);
}

/**
 * Helper para crear errores de negocio
 */
export function errorNegocio(
  code: ErrorCode,
  mensaje: string,
  detalles?: Record<string, any>
): ServicioError {
  return new ServicioError(code, mensaje, detalles);
}

/**
 * Helper para crear errores de concurrencia
 */
export function errorConcurrencia(
  mensaje: string,
  detalles?: Record<string, any>
): ServicioError {
  return new ServicioError(ErrorCode.CONCURRENCIA_ERROR, mensaje, detalles);
}

