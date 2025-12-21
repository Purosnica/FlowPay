/**
 * CONFIGURACIÓN DEL SISTEMA
 * 
 * Valores de configuración técnica del sistema como timeouts, límites, etc.
 */

/**
 * Configuración de transacciones de base de datos
 */
export const TRANSACTION_CONFIG = {
  /**
   * Tiempo máximo de espera para adquirir un lock de transacción (ms)
   */
  MAX_WAIT: 10000, // 10 segundos

  /**
   * Tiempo máximo de ejecución de una transacción (ms)
   */
  TIMEOUT: 20000, // 20 segundos

  /**
   * Tiempo máximo de ejecución para transacciones complejas (ms)
   * Usado en refinanciamientos y operaciones que requieren más tiempo
   */
  TIMEOUT_COMPLEX: 30000, // 30 segundos
} as const;

/**
 * Configuración de locks lógicos
 */
export const LOCK_CONFIG = {
  /**
   * Timeout por defecto para locks (segundos)
   * Usado en operaciones normales como pagos y castigos
   */
  TIMEOUT_DEFAULT: 300, // 5 minutos

  /**
   * Timeout para operaciones complejas (segundos)
   * Usado en refinanciamientos y reestructuraciones
   */
  TIMEOUT_COMPLEX: 600, // 10 minutos
} as const;

/**
 * Configuración de validación
 */
export const VALIDATION_CONFIG = {
  /**
   * Longitud mínima de motivo de castigo
   */
  MOTIVO_CASTIGO_MIN_LENGTH: 1,
} as const;

