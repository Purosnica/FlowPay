/**
 * Registro central reporte → permiso fino + grupo legacy.
 *
 * Acceso = permiso fino del reporte OR grupo OR comodín REPORTE_READ.
 * Asignar códigos finos en RBAC para restringir reporte a reporte.
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

/** Permiso fino por reporte (RBAC granular). */
export const REPORTE_PERMISO_MAP: Record<ReporteKey, PermisoCodigo> = {
  [REPORTE_KEY.hub]: PERMISO.REPORTE_HUB_READ,
  [REPORTE_KEY.cobranza]: PERMISO.REPORTE_COBRANZA_KPI_READ,
  [REPORTE_KEY.aging]: PERMISO.REPORTE_AGING_READ,
  [REPORTE_KEY.informeGerencial]: PERMISO.REPORTE_INFORME_GERENCIAL_READ,
  [REPORTE_KEY.informeGestiones]: PERMISO.REPORTE_INFORME_GESTIONES_READ,
  [REPORTE_KEY.ganancias]: PERMISO.REPORTE_GANANCIAS_READ,
  [REPORTE_KEY.comisionesCobradores]: PERMISO.REPORTE_COMISIONES_COBRADORES_READ,
  [REPORTE_KEY.efectividad]: PERMISO.REPORTE_EFECTIVIDAD_READ,
  [REPORTE_KEY.cumplimientoAcuerdos]:
    PERMISO.REPORTE_CUMPLIMIENTO_ACUERDOS_READ,
  [REPORTE_KEY.carteraSinGestion]: PERMISO.REPORTE_CARTERA_SIN_GESTION_READ,
  [REPORTE_KEY.margenMandantes]: PERMISO.REPORTE_MARGEN_MANDANTES_READ,
  [REPORTE_KEY.comisionesVsProyeccion]:
    PERMISO.REPORTE_COMISIONES_VS_PROYECCION_READ,
  [REPORTE_KEY.ingresoTramoMora]: PERMISO.REPORTE_INGRESO_TRAMO_MORA_READ,
  [REPORTE_KEY.promesasPago]: PERMISO.REPORTE_PROMESAS_PAGO_READ,
  [REPORTE_KEY.productividadDiaria]: PERMISO.REPORTE_PRODUCTIVIDAD_DIARIA_READ,
  [REPORTE_KEY.recontactos]: PERMISO.REPORTE_RECONTACTOS_READ,
  [REPORTE_KEY.reclamosSla]: PERMISO.REPORTE_RECLAMOS_SLA_READ,
  [REPORTE_KEY.migracionMora]: PERMISO.REPORTE_MIGRACION_MORA_READ,
  [REPORTE_KEY.concentracionRiesgo]: PERMISO.REPORTE_CONCENTRACION_RIESGO_READ,
  [REPORTE_KEY.cuotasVencidas]: PERMISO.REPORTE_CUOTAS_VENCIDAS_READ,
  [REPORTE_KEY.cumplimientoMetas]: PERMISO.REPORTE_CUMPLIMIENTO_METAS_READ,
  [REPORTE_KEY.supervisorEquipo]: PERMISO.REPORTE_SUPERVISOR_EQUIPO_READ,
};

/** Grupo legacy: quien tiene el grupo sigue viendo todos los reportes del grupo. */
export const REPORTE_GRUPO_MAP: Record<ReporteKey, PermisoCodigo> = {
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
  return REPORTE_GRUPO_MAP[key];
}

export function permisoFinoDeReporte(key: ReporteKey): PermisoCodigo {
  return REPORTE_PERMISO_MAP[key];
}

/**
 * Fino + grupo + comodín REPORTE_READ (legacy / acceso total).
 */
export function permisosDeReporte(key: ReporteKey): PermisoCodigo[] {
  return [
    REPORTE_PERMISO_MAP[key],
    REPORTE_GRUPO_MAP[key],
    PERMISO.REPORTE_READ,
  ];
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
