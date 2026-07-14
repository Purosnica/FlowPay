/**
 * Registro central reporte → permiso de grupo.
 *
 * Escalar a permiso por reporte: cambiar valores del mapa a códigos
 * `REPORTE_GANANCIAS_READ` (etc.) sin reescribir resolvers/nav.
 * Escala a usuario: asignar esos códigos al rol o al usuario vía RBAC existente.
 */

import { requerirAlgunPermiso } from './permission-service';
import { PERMISO, type PermisoCodigo } from './permiso-codes';

export const REPORTE_KEY = {
  hub: 'hub',
  cobranza: 'cobranza',
  aging: 'aging',
  informeGerencial: 'informeGerencial',
  informeGestiones: 'informeGestiones',
  ganancias: 'ganancias',
  comisionesCobradores: 'comisionesCobradores',
  efectividad: 'efectividad',
  cumplimientoAcuerdos: 'cumplimientoAcuerdos',
  carteraSinGestion: 'carteraSinGestion',
  margenMandantes: 'margenMandantes',
  comisionesVsProyeccion: 'comisionesVsProyeccion',
  ingresoTramoMora: 'ingresoTramoMora',
  promesasPago: 'promesasPago',
  productividadDiaria: 'productividadDiaria',
  recontactos: 'recontactos',
  reclamosSla: 'reclamosSla',
  migracionMora: 'migracionMora',
  concentracionRiesgo: 'concentracionRiesgo',
  cuotasVencidas: 'cuotasVencidas',
  cumplimientoMetas: 'cumplimientoMetas',
  supervisorEquipo: 'supervisorEquipo',
} as const;

export type ReporteKey = (typeof REPORTE_KEY)[keyof typeof REPORTE_KEY];

/**
 * Mapa reporte → permiso de grupo.
 * TODO(futuro): valores por reporte fino o array de permisos.
 */
export const REPORTE_PERMISO_MAP: Record<ReporteKey, PermisoCodigo> = {
  [REPORTE_KEY.hub]: PERMISO.REPORTE_COBRANZA_READ,
  [REPORTE_KEY.cobranza]: PERMISO.REPORTE_COBRANZA_READ,
  [REPORTE_KEY.aging]: PERMISO.REPORTE_COBRANZA_READ,
  [REPORTE_KEY.informeGerencial]: PERMISO.REPORTE_GERENCIAL_READ,
  [REPORTE_KEY.informeGestiones]: PERMISO.REPORTE_OPERACION_READ,
  [REPORTE_KEY.ganancias]: PERMISO.REPORTE_FINANZAS_READ,
  [REPORTE_KEY.comisionesCobradores]: PERMISO.REPORTE_FINANZAS_READ,
  [REPORTE_KEY.efectividad]: PERMISO.REPORTE_OPERACION_READ,
  [REPORTE_KEY.cumplimientoAcuerdos]: PERMISO.REPORTE_RIESGO_READ,
  [REPORTE_KEY.carteraSinGestion]: PERMISO.REPORTE_RIESGO_READ,
  [REPORTE_KEY.margenMandantes]: PERMISO.REPORTE_FINANZAS_READ,
  [REPORTE_KEY.comisionesVsProyeccion]: PERMISO.REPORTE_FINANZAS_READ,
  [REPORTE_KEY.ingresoTramoMora]: PERMISO.REPORTE_FINANZAS_READ,
  [REPORTE_KEY.promesasPago]: PERMISO.REPORTE_OPERACION_READ,
  [REPORTE_KEY.productividadDiaria]: PERMISO.REPORTE_OPERACION_READ,
  [REPORTE_KEY.recontactos]: PERMISO.REPORTE_OPERACION_READ,
  [REPORTE_KEY.reclamosSla]: PERMISO.REPORTE_RIESGO_READ,
  [REPORTE_KEY.migracionMora]: PERMISO.REPORTE_RIESGO_READ,
  [REPORTE_KEY.concentracionRiesgo]: PERMISO.REPORTE_RIESGO_READ,
  [REPORTE_KEY.cuotasVencidas]: PERMISO.REPORTE_RIESGO_READ,
  [REPORTE_KEY.cumplimientoMetas]: PERMISO.REPORTE_EQUIPO_READ,
  [REPORTE_KEY.supervisorEquipo]: PERMISO.REPORTE_EQUIPO_READ,
};

/** Paths de reportes (slug bajo /cobranza/reportes) → clave. */
export const REPORTE_PATH_KEY: Record<string, ReporteKey> = {
  '': REPORTE_KEY.hub,
  ganancias: REPORTE_KEY.ganancias,
  'comisiones-cobradores': REPORTE_KEY.comisionesCobradores,
  efectividad: REPORTE_KEY.efectividad,
  'cumplimiento-acuerdos': REPORTE_KEY.cumplimientoAcuerdos,
  'cartera-sin-gestion': REPORTE_KEY.carteraSinGestion,
  'margen-mandantes': REPORTE_KEY.margenMandantes,
  'comisiones-vs-proyeccion': REPORTE_KEY.comisionesVsProyeccion,
  'ingreso-tramo-mora': REPORTE_KEY.ingresoTramoMora,
  'promesas-pago': REPORTE_KEY.promesasPago,
  'productividad-diaria': REPORTE_KEY.productividadDiaria,
  recontactos: REPORTE_KEY.recontactos,
  'reclamos-sla': REPORTE_KEY.reclamosSla,
  'migracion-mora': REPORTE_KEY.migracionMora,
  'concentracion-riesgo': REPORTE_KEY.concentracionRiesgo,
  'cuotas-vencidas': REPORTE_KEY.cuotasVencidas,
  'cumplimiento-metas': REPORTE_KEY.cumplimientoMetas,
  'supervisor-equipo': REPORTE_KEY.supervisorEquipo,
  'informe-gerencial': REPORTE_KEY.informeGerencial,
  'informe-gestiones': REPORTE_KEY.informeGestiones,
};

export function permisoGrupoDeReporte(key: ReporteKey): PermisoCodigo {
  return REPORTE_PERMISO_MAP[key];
}

/**
 * Grupo del reporte + comodín REPORTE_READ (legacy / acceso total).
 */
export function permisosDeReporte(key: ReporteKey): PermisoCodigo[] {
  return [REPORTE_PERMISO_MAP[key], PERMISO.REPORTE_READ];
}

export async function requerirReporte(
  idusuario: number | null | undefined,
  key: ReporteKey,
): Promise<void> {
  await requerirAlgunPermiso(idusuario, permisosDeReporte(key));
}

export function usuarioPuedeVerReporte(
  permisosUsuario: string[],
  key: ReporteKey,
): boolean {
  return permisosDeReporte(key).some((p) => permisosUsuario.includes(p));
}
