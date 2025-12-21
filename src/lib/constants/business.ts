/**
 * REGLAS DE NEGOCIO
 * 
 * Constantes que representan reglas de negocio del sistema:
 * - Montos mínimos y máximos
 * - Plazos permitidos
 * - Porcentajes
 * - Límites de operaciones
 */

/**
 * Reglas de negocio para préstamos
 */
export const PRESTAMO_RULES = {
  /**
   * Monto mínimo de préstamo (si aplica)
   */
  MONTO_MINIMO: 0, // TODO: Definir monto mínimo según negocio

  /**
   * Monto máximo de préstamo (si aplica)
   */
  MONTO_MAXIMO: Number.MAX_SAFE_INTEGER, // TODO: Definir monto máximo según negocio

  /**
   * Plazo mínimo en meses
   */
  PLAZO_MINIMO_MESES: 1,

  /**
   * Plazo máximo en meses
   */
  PLAZO_MAXIMO_MESES: 360, // 30 años

  /**
   * Tasa de interés mínima anual (%)
   */
  TASA_INTERES_MINIMA: 0,

  /**
   * Tasa de interés máxima anual (%)
   */
  TASA_INTERES_MAXIMA: 100,
} as const;

/**
 * Reglas de negocio para pagos
 */
export const PAGO_RULES = {
  /**
   * Monto mínimo de pago
   */
  MONTO_MINIMO: 0.01,

  /**
   * Monto máximo de pago (si aplica)
   */
  MONTO_MAXIMO: Number.MAX_SAFE_INTEGER,
} as const;

/**
 * Reglas de negocio para cuotas
 */
export const CUOTA_RULES = {
  /**
   * Día de pago por defecto (1-31)
   */
  DIA_PAGO_DEFAULT: 1,

  /**
   * Número mínimo de cuotas
   */
  NUMERO_MINIMO: 1,

  /**
   * Número máximo de cuotas
   */
  NUMERO_MAXIMO: 360,
} as const;

/**
 * Reglas de negocio para castigo
 */
export const CASTIGO_RULES = {
  /**
   * Longitud mínima del motivo de castigo
   */
  MOTIVO_MIN_LENGTH: 1,

  /**
   * Longitud máxima del motivo de castigo
   */
  MOTIVO_MAX_LENGTH: 1000,
} as const;

