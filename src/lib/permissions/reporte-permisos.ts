/**
 * Registro central reporte → permiso fino + grupo legacy.
 *
 * Acceso = permiso fino del reporte OR grupo OR comodín REPORTE_READ.
 * Asignar códigos finos en RBAC para restringir reporte a reporte.
 */

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
  clienteObligaciones: 'clienteObligaciones',
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
  [REPORTE_KEY.clienteObligaciones]: PERMISO.REPORTE_CLIENTE_OBLIGACIONES_READ,
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
  [REPORTE_KEY.clienteObligaciones]: PERMISO.REPORTE_RIESGO_READ,
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
  'cliente-obligaciones': REPORTE_KEY.clienteObligaciones,
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

export function usuarioPuedeVerReporte(
  permisosUsuario: string[],
  key: ReporteKey,
): boolean {
  return permisosDeReporte(key).some((p) => permisosUsuario.includes(p));
}

export type ReporteHubCategoria =
  | 'Informes'
  | 'Desempeño'
  | 'Seguimiento'
  | 'Riesgo'
  | 'Financiero';

/** Catálogo único del hub (sidebar reducido apunta aquí). */
export const CATALOGO_REPORTES_HUB: ReadonlyArray<{
  href: string;
  label: string;
  key: ReporteKey;
  categoria: ReporteHubCategoria;
}> = [
  {
    href: '/cobranza/reportes/informe-gerencial',
    label: 'Informe gerencial',
    key: REPORTE_KEY.informeGerencial,
    categoria: 'Informes',
  },
  {
    href: '/cobranza/reportes/informe-gestiones',
    label: 'Informe de gestiones',
    key: REPORTE_KEY.informeGestiones,
    categoria: 'Informes',
  },
  {
    href: '/cobranza/reportes/efectividad',
    label: 'Efectividad',
    key: REPORTE_KEY.efectividad,
    categoria: 'Desempeño',
  },
  {
    href: '/cobranza/reportes/productividad-diaria',
    label: 'Productividad diaria',
    key: REPORTE_KEY.productividadDiaria,
    categoria: 'Desempeño',
  },
  {
    href: '/cobranza/reportes/cumplimiento-metas',
    label: 'Cumplimiento de metas',
    key: REPORTE_KEY.cumplimientoMetas,
    categoria: 'Desempeño',
  },
  {
    href: '/cobranza/reportes/supervisor-equipo',
    label: 'Supervisor vs equipo',
    key: REPORTE_KEY.supervisorEquipo,
    categoria: 'Desempeño',
  },
  {
    href: '/cobranza/reportes/promesas-pago',
    label: 'Promesas de pago',
    key: REPORTE_KEY.promesasPago,
    categoria: 'Seguimiento',
  },
  {
    href: '/cobranza/reportes/cumplimiento-acuerdos',
    label: 'Cumplimiento de acuerdos',
    key: REPORTE_KEY.cumplimientoAcuerdos,
    categoria: 'Seguimiento',
  },
  {
    href: '/cobranza/reportes/cuotas-vencidas',
    label: 'Cuotas vencidas',
    key: REPORTE_KEY.cuotasVencidas,
    categoria: 'Seguimiento',
  },
  {
    href: '/cobranza/reportes/cartera-sin-gestion',
    label: 'Cartera sin gestión',
    key: REPORTE_KEY.carteraSinGestion,
    categoria: 'Seguimiento',
  },
  {
    href: '/cobranza/reportes/recontactos',
    label: 'Recontactos',
    key: REPORTE_KEY.recontactos,
    categoria: 'Seguimiento',
  },
  {
    href: '/cobranza/reportes/reclamos-sla',
    label: 'SLA de reclamos',
    key: REPORTE_KEY.reclamosSla,
    categoria: 'Riesgo',
  },
  {
    href: '/cobranza/reportes/migracion-mora',
    label: 'Migración de mora',
    key: REPORTE_KEY.migracionMora,
    categoria: 'Riesgo',
  },
  {
    href: '/cobranza/reportes/concentracion-riesgo',
    label: 'Concentración de riesgo',
    key: REPORTE_KEY.concentracionRiesgo,
    categoria: 'Riesgo',
  },
  {
    href: '/cobranza/reportes/cliente-obligaciones',
    label: 'Cliente obligaciones',
    key: REPORTE_KEY.clienteObligaciones,
    categoria: 'Riesgo',
  },
  {
    href: '/cobranza/reportes/ingreso-tramo-mora',
    label: 'Ingreso por tramo de mora',
    key: REPORTE_KEY.ingresoTramoMora,
    categoria: 'Financiero',
  },
  {
    href: '/cobranza/reportes/ganancias',
    label: 'Ganancias',
    key: REPORTE_KEY.ganancias,
    categoria: 'Financiero',
  },
  {
    href: '/cobranza/reportes/margen-mandantes',
    label: 'Margen por mandante',
    key: REPORTE_KEY.margenMandantes,
    categoria: 'Financiero',
  },
  {
    href: '/cobranza/reportes/comisiones-cobradores',
    label: 'Comisiones a cobradores',
    key: REPORTE_KEY.comisionesCobradores,
    categoria: 'Financiero',
  },
  {
    href: '/cobranza/reportes/comisiones-vs-proyeccion',
    label: 'Comisiones vs proyección',
    key: REPORTE_KEY.comisionesVsProyeccion,
    categoria: 'Financiero',
  },
];

