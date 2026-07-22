/**
 * Límites de rendimiento compartidos en servicios de cobranza.
 * Los límites de candidatos pueden sobreescribirse por mandante vía
 * tbl_configuracion_sistema.
 */

import {
  CLAVE_BANDEJA_CANDIDATE_LIMIT,
  CLAVE_MI_DIA_CANDIDATE_LIMIT,
  claveMetaMandante,
  obtenerConfigNumericaConFallback,
} from './configuracion-cobranza-service';

export {
  CLAVE_BANDEJA_CANDIDATE_LIMIT,
  CLAVE_MI_DIA_CANDIDATE_LIMIT,
};

/** Default candidatos máximos antes de ordenar por prioridad en bandeja. */
export const BANDEJA_PRIORIDAD_CANDIDATE_LIMIT = 500;

/** Default candidatos máximos antes de ordenar por prioridad en Mi día. */
export const MI_DIA_PRIORIDAD_CANDIDATE_LIMIT = 200;

/** Listas de usuarios activos sin paginación (selectores). */
export const LISTA_USUARIOS_ACTIVOS_LIMIT = 200;

/** Búsqueda global de clientes. */
export const BUSQUEDA_CLIENTE_LIMITE_MAX = 50;

/** Timeline de préstamo. */
export const TIMELINE_PRESTAMO_LIMITE_MAX = 100;

/** Filas de reporte a partir de las cuales el export debe ser async. */
export const EXPORT_ASYNC_ROW_THRESHOLD = 10_000;

/** Umbral de filas para virtualizar tablas TanStack. */
export const TABLE_VIRTUALIZE_ROW_THRESHOLD = 40;

function clampLimit(n: number, fallback: number): number {
  if (!Number.isFinite(n) || n < 1) {
    return fallback;
  }
  return Math.min(Math.floor(n), 5_000);
}

export async function obtenerLimiteCandidatosBandeja(
  idmandante?: number,
): Promise<number> {
  if (idmandante == null) {
    return BANDEJA_PRIORIDAD_CANDIDATE_LIMIT;
  }
  const n = await obtenerConfigNumericaConFallback(
    claveMetaMandante(CLAVE_BANDEJA_CANDIDATE_LIMIT, idmandante),
    CLAVE_BANDEJA_CANDIDATE_LIMIT,
  );
  return clampLimit(n, BANDEJA_PRIORIDAD_CANDIDATE_LIMIT);
}

export async function obtenerLimiteCandidatosMiDia(
  idmandante?: number,
): Promise<number> {
  if (idmandante == null) {
    return MI_DIA_PRIORIDAD_CANDIDATE_LIMIT;
  }
  const n = await obtenerConfigNumericaConFallback(
    claveMetaMandante(CLAVE_MI_DIA_CANDIDATE_LIMIT, idmandante),
    CLAVE_MI_DIA_CANDIDATE_LIMIT,
  );
  return clampLimit(n, MI_DIA_PRIORIDAD_CANDIDATE_LIMIT);
}
