/**
 * ENUMS Y VALORES ENUMERADOS COMPARTIDOS
 * 
 * Enums y valores constantes que representan opciones del sistema.
 * Estos valores complementan los enums generados por Prisma.
 */

/**
 * Métodos de pago considerados judiciales
 * Para préstamos castigados, solo se permiten pagos con estos métodos
 */
export const METODOS_PAGO_JUDICIALES = [
  "JUDICIAL",
  "EMBARGOS",
  "ORDEN_JUDICIAL",
] as const;

export type MetodoPagoJudicial = typeof METODOS_PAGO_JUDICIALES[number];

/**
 * Acciones de auditoría comunes
 */
export const ACCIONES_AUDITORIA = {
  CASTIGAR_PRESTAMO: "CASTIGAR_PRESTAMO",
  CASTIGAR_CARTERA: "CASTIGAR_CARTERA",
  CREAR_CASTIGO: "CREAR_CASTIGO",
  CANCELAR_CUOTAS_CASTIGO: "CANCELAR_CUOTAS_CASTIGO",
  CREAR_PRESTAMO: "CREAR_PRESTAMO",
  ACTUALIZAR_PRESTAMO: "ACTUALIZAR_PRESTAMO",
  ELIMINAR_PRESTAMO_SOFT: "ELIMINAR_PRESTAMO_SOFT",
  CREAR_CUOTA: "CREAR_CUOTA",
  ACTUALIZAR_CUOTA: "ACTUALIZAR_CUOTA",
  ELIMINAR_CUOTA_SOFT: "ELIMINAR_CUOTA_SOFT",
  CREAR_PAGO: "CREAR_PAGO",
  ACTUALIZAR_PAGO: "ACTUALIZAR_PAGO",
  ELIMINAR_PAGO_SOFT: "ELIMINAR_PAGO_SOFT",
  ASIGNAR_GESTOR: "ASIGNAR_GESTOR",
} as const;

export type AccionAuditoria = typeof ACCIONES_AUDITORIA[keyof typeof ACCIONES_AUDITORIA];

/**
 * Entidades del sistema para auditoría
 */
export const ENTIDADES_SISTEMA = {
  PRESTAMO: "tbl_prestamo",
  CUOTA: "tbl_cuota",
  PAGO: "tbl_pago",
  CASTIGO: "tbl_castigo",
  ACUERDO: "tbl_acuerdo",
  CLIENTE: "tbl_cliente",
} as const;

export type EntidadSistema = typeof ENTIDADES_SISTEMA[keyof typeof ENTIDADES_SISTEMA];

