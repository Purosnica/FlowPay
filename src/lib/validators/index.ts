/**
 * EXPORTACIÓN CENTRALIZADA DE VALIDADORES
 * 
 * Este archivo exporta todos los validadores del sistema organizados por dominio.
 * 
 * Los schemas mantienen nombres compatibles con el código existente para facilitar
 * la migración gradual.
 */

// Validadores compartidos
export * from "./shared";

// Validadores por dominio
export * from "./prestamo";
export * from "./pago";
// Cliente y cobranza aún no tienen validadores implementados
// export * from "./cliente";
// export * from "./cobranza";

// Aliases para compatibilidad con código existente (migración gradual)
// Estos pueden eliminarse una vez que todo el código use los nuevos imports
export {
  createPrestamoSchema as CreatePrestamoInputSchema,
  updatePrestamoSchema as UpdatePrestamoInputSchema,
  prestamoFiltersSchema as PrestamoFiltersSchema,
} from "./prestamo";

export {
  createPagoSchema as CreatePagoInputSchema,
  updatePagoSchema as UpdatePagoInputSchema,
} from "./pago";

