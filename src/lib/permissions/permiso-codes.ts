/**
 * Códigos de permisos del sistema (RBAC).
 * Fuente única de verdad para seed, type-safety y documentación.
 */

export const PERMISO = {
  USER_READ: 'USER_READ',
  USER_WRITE: 'USER_WRITE',
  CONFIG_SYSTEM: 'CONFIG_SYSTEM',
  MANDANTE_READ: 'MANDANTE_READ',
  MANDANTE_WRITE: 'MANDANTE_WRITE',
  CARTERA_READ: 'CARTERA_READ',
  CARTERA_WRITE: 'CARTERA_WRITE',
  GESTION_READ: 'GESTION_READ',
  GESTION_WRITE: 'GESTION_WRITE',
  ACUERDO_READ: 'ACUERDO_READ',
  ACUERDO_WRITE: 'ACUERDO_WRITE',
  PAGO_READ: 'PAGO_READ',
  PAGO_WRITE: 'PAGO_WRITE',
  /** Conciliar / aplicar / desaplicar pagos (SoD H07). */
  PAGO_APPLY: 'PAGO_APPLY',
  LIQUIDACION_READ: 'LIQUIDACION_READ',
  LIQUIDACION_WRITE: 'LIQUIDACION_WRITE',
  /** Comodín legacy: acceso a todos los reportes. */
  REPORTE_READ: 'REPORTE_READ',
  REPORTE_COBRANZA_READ: 'REPORTE_COBRANZA_READ',
  REPORTE_FINANZAS_READ: 'REPORTE_FINANZAS_READ',
  REPORTE_OPERACION_READ: 'REPORTE_OPERACION_READ',
  REPORTE_RIESGO_READ: 'REPORTE_RIESGO_READ',
  REPORTE_GERENCIAL_READ: 'REPORTE_GERENCIAL_READ',
  REPORTE_EQUIPO_READ: 'REPORTE_EQUIPO_READ',
  /** Permisos finos por reporte (opcional; el grupo sigue abriendo el bloque). */
  REPORTE_HUB_READ: 'REPORTE_HUB_READ',
  REPORTE_COBRANZA_KPI_READ: 'REPORTE_COBRANZA_KPI_READ',
  REPORTE_AGING_READ: 'REPORTE_AGING_READ',
  REPORTE_INFORME_GERENCIAL_READ: 'REPORTE_INFORME_GERENCIAL_READ',
  REPORTE_INFORME_GESTIONES_READ: 'REPORTE_INFORME_GESTIONES_READ',
  REPORTE_GANANCIAS_READ: 'REPORTE_GANANCIAS_READ',
  REPORTE_COMISIONES_COBRADORES_READ: 'REPORTE_COMISIONES_COBRADORES_READ',
  REPORTE_EFECTIVIDAD_READ: 'REPORTE_EFECTIVIDAD_READ',
  REPORTE_CUMPLIMIENTO_ACUERDOS_READ: 'REPORTE_CUMPLIMIENTO_ACUERDOS_READ',
  REPORTE_CARTERA_SIN_GESTION_READ: 'REPORTE_CARTERA_SIN_GESTION_READ',
  REPORTE_MARGEN_MANDANTES_READ: 'REPORTE_MARGEN_MANDANTES_READ',
  REPORTE_COMISIONES_VS_PROYECCION_READ:
    'REPORTE_COMISIONES_VS_PROYECCION_READ',
  REPORTE_INGRESO_TRAMO_MORA_READ: 'REPORTE_INGRESO_TRAMO_MORA_READ',
  REPORTE_PROMESAS_PAGO_READ: 'REPORTE_PROMESAS_PAGO_READ',
  REPORTE_PRODUCTIVIDAD_DIARIA_READ: 'REPORTE_PRODUCTIVIDAD_DIARIA_READ',
  REPORTE_RECONTACTOS_READ: 'REPORTE_RECONTACTOS_READ',
  REPORTE_RECLAMOS_SLA_READ: 'REPORTE_RECLAMOS_SLA_READ',
  REPORTE_MIGRACION_MORA_READ: 'REPORTE_MIGRACION_MORA_READ',
  REPORTE_CONCENTRACION_RIESGO_READ: 'REPORTE_CONCENTRACION_RIESGO_READ',
  REPORTE_CUOTAS_VENCIDAS_READ: 'REPORTE_CUOTAS_VENCIDAS_READ',
  REPORTE_CUMPLIMIENTO_METAS_READ: 'REPORTE_CUMPLIMIENTO_METAS_READ',
  REPORTE_SUPERVISOR_EQUIPO_READ: 'REPORTE_SUPERVISOR_EQUIPO_READ',
  INTELIGENCIA_READ: 'INTELIGENCIA_READ',
  EQUIPO_READ: 'EQUIPO_READ',
} as const;

export type PermisoCodigo = (typeof PERMISO)[keyof typeof PERMISO];

export type PermisoCategoria = 'ADMINISTRACION' | 'CONFIGURACION' | 'COBRANZA';

export type PermisoTipo = 'administrativo' | 'operativo';

export interface PermisoDefinicion {
  codigo: PermisoCodigo;
  nombre: string;
  descripcion: string;
  categoria: PermisoCategoria;
  tipo: PermisoTipo;
}

/** Catálogo canónico — usado por seed y docs/PERMISOS-RBAC.md */
export const PERMISOS_CATALOGO: PermisoDefinicion[] = [
  {
    codigo: PERMISO.USER_READ,
    nombre: 'Ver Usuarios',
    descripcion: 'Consultar usuarios, roles y asignaciones',
    categoria: 'ADMINISTRACION',
    tipo: 'administrativo',
  },
  {
    codigo: PERMISO.USER_WRITE,
    nombre: 'Gestionar Usuarios',
    descripcion: 'Crear, editar usuarios y asignar permisos a roles',
    categoria: 'ADMINISTRACION',
    tipo: 'administrativo',
  },
  {
    codigo: PERMISO.CONFIG_SYSTEM,
    nombre: 'Configurar Sistema',
    descripcion: 'Modificar configuración global, auditoría y cron',
    categoria: 'CONFIGURACION',
    tipo: 'administrativo',
  },
  {
    codigo: PERMISO.MANDANTE_READ,
    nombre: 'Ver Mandantes',
    descripcion: 'Consultar mandantes y su configuración operativa',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.MANDANTE_WRITE,
    nombre: 'Gestionar Mandantes',
    descripcion: 'Crear y editar mandantes, contratos y plantillas',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.CARTERA_READ,
    nombre: 'Ver Cartera',
    descripcion: 'Consultar cartera, préstamos, clientes y bandeja',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.CARTERA_WRITE,
    nombre: 'Gestionar Cartera',
    descripcion: 'Importar cartera, asignar cobradores y modificar datos',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.GESTION_READ,
    nombre: 'Ver Gestiones',
    descripcion: 'Consultar gestiones de cobro y reclamos',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.GESTION_WRITE,
    nombre: 'Registrar Gestiones',
    descripcion: 'Registrar gestiones de cobro y reclamos',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.ACUERDO_READ,
    nombre: 'Ver Acuerdos',
    descripcion: 'Consultar acuerdos y promesas de pago',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.ACUERDO_WRITE,
    nombre: 'Gestionar Acuerdos',
    descripcion: 'Crear y modificar acuerdos de pago',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.PAGO_READ,
    nombre: 'Ver Pagos',
    descripcion: 'Consultar pagos registrados',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.PAGO_WRITE,
    nombre: 'Registrar Pagos',
    descripcion: 'Registrar pagos de deudores',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.PAGO_APPLY,
    nombre: 'Aplicar / Conciliar Pagos',
    descripcion:
      'Marcar pagos como aplicados o desaplicarlos (segregación de funciones)',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.LIQUIDACION_READ,
    nombre: 'Ver Liquidaciones',
    descripcion: 'Consultar liquidaciones a mandantes',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.LIQUIDACION_WRITE,
    nombre: 'Gestionar Liquidaciones',
    descripcion: 'Crear y emitir liquidaciones a mandantes',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_READ,
    nombre: 'Ver todos los reportes',
    descripcion:
      'Acceso completo a reportes (comodín legacy). Preferir grupos granulares.',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_COBRANZA_READ,
    nombre: 'Reportes de cobranza',
    descripcion: 'Hub de KPIs, aging y forecast de cobranza',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_FINANZAS_READ,
    nombre: 'Reportes financieros',
    descripcion:
      'Ganancias, comisiones, margen, ingreso por tramo y vs proyección',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_OPERACION_READ,
    nombre: 'Reportes operativos',
    descripcion:
      'Efectividad, gestiones, promesas, productividad y recontactos',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_RIESGO_READ,
    nombre: 'Reportes de riesgo',
    descripcion:
      'Acuerdos, cartera sin gestión, mora, concentración, cuotas y SLA',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_GERENCIAL_READ,
    nombre: 'Informe gerencial',
    descripcion: 'Acceso al informe gerencial',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_EQUIPO_READ,
    nombre: 'Reportes de equipo',
    descripcion: 'Cumplimiento de metas y supervisor vs equipo',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_HUB_READ,
    nombre: 'Hub de reportes',
    descripcion: 'Acceso fino al hub de reportes de cobranza',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_COBRANZA_KPI_READ,
    nombre: 'KPIs de cobranza',
    descripcion: 'Acceso fino a KPIs embebidos de cobranza',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_AGING_READ,
    nombre: 'Aging de cartera',
    descripcion: 'Acceso fino al aging de cartera',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_INFORME_GERENCIAL_READ,
    nombre: 'Informe gerencial (fino)',
    descripcion: 'Acceso fino al informe gerencial',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_INFORME_GESTIONES_READ,
    nombre: 'Informe de gestiones',
    descripcion: 'Acceso fino al informe de gestiones',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_GANANCIAS_READ,
    nombre: 'Ganancias',
    descripcion: 'Acceso fino al reporte de ganancias',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_COMISIONES_COBRADORES_READ,
    nombre: 'Comisiones cobradores',
    descripcion: 'Acceso fino a comisiones de cobradores',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_EFECTIVIDAD_READ,
    nombre: 'Efectividad',
    descripcion: 'Acceso fino al reporte de efectividad',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_CUMPLIMIENTO_ACUERDOS_READ,
    nombre: 'Cumplimiento de acuerdos',
    descripcion: 'Acceso fino a cumplimiento de acuerdos',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_CARTERA_SIN_GESTION_READ,
    nombre: 'Cartera sin gestión',
    descripcion: 'Acceso fino a cartera sin gestión',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_MARGEN_MANDANTES_READ,
    nombre: 'Margen mandantes',
    descripcion: 'Acceso fino a margen por mandante',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_COMISIONES_VS_PROYECCION_READ,
    nombre: 'Comisiones vs proyección',
    descripcion: 'Acceso fino a comisiones vs proyección',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_INGRESO_TRAMO_MORA_READ,
    nombre: 'Ingreso por tramo de mora',
    descripcion: 'Acceso fino a ingreso por tramo de mora',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_PROMESAS_PAGO_READ,
    nombre: 'Promesas de pago',
    descripcion: 'Acceso fino a promesas de pago',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_PRODUCTIVIDAD_DIARIA_READ,
    nombre: 'Productividad diaria',
    descripcion: 'Acceso fino a productividad diaria',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_RECONTACTOS_READ,
    nombre: 'Recontactos',
    descripcion: 'Acceso fino a recontactos',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_RECLAMOS_SLA_READ,
    nombre: 'Reclamos SLA',
    descripcion: 'Acceso fino a reclamos fuera de SLA',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_MIGRACION_MORA_READ,
    nombre: 'Migración de mora',
    descripcion: 'Acceso fino a migración de mora',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_CONCENTRACION_RIESGO_READ,
    nombre: 'Concentración de riesgo',
    descripcion: 'Acceso fino a concentración de riesgo',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_CUOTAS_VENCIDAS_READ,
    nombre: 'Cuotas vencidas',
    descripcion: 'Acceso fino a cuotas vencidas',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_CUMPLIMIENTO_METAS_READ,
    nombre: 'Cumplimiento de metas',
    descripcion: 'Acceso fino a cumplimiento de metas',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.REPORTE_SUPERVISOR_EQUIPO_READ,
    nombre: 'Supervisor vs equipo',
    descripcion: 'Acceso fino a supervisor vs equipo',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.INTELIGENCIA_READ,
    nombre: 'Centro de Inteligencia',
    descripcion: 'Acceso al centro de decisiones y analytics operativos',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
  {
    codigo: PERMISO.EQUIPO_READ,
    nombre: 'Supervisión de Equipo',
    descripcion: 'Dashboard de equipo, rankings y gamificación',
    categoria: 'COBRANZA',
    tipo: 'operativo',
  },
];

/** Grupos de reportes (sin el comodín REPORTE_READ). */
export const PERMISOS_REPORTE_GRUPOS: PermisoCodigo[] = [
  PERMISO.REPORTE_COBRANZA_READ,
  PERMISO.REPORTE_FINANZAS_READ,
  PERMISO.REPORTE_OPERACION_READ,
  PERMISO.REPORTE_RIESGO_READ,
  PERMISO.REPORTE_GERENCIAL_READ,
  PERMISO.REPORTE_EQUIPO_READ,
];

/** Cualquier acceso al módulo Reportes (grupo o comodín). */
export const PERMISOS_REPORTE_CUALQUIERA: PermisoCodigo[] = [
  ...PERMISOS_REPORTE_GRUPOS,
  PERMISO.REPORTE_READ,
];

/** Presets de rol — deben coincidir con prisma/seed-permisos.ts */
export const PERMISOS_COBRADOR: PermisoCodigo[] = [
  PERMISO.CARTERA_READ,
  PERMISO.MANDANTE_READ,
  PERMISO.GESTION_READ,
  PERMISO.GESTION_WRITE,
  PERMISO.ACUERDO_READ,
  PERMISO.ACUERDO_WRITE,
  PERMISO.PAGO_READ,
  PERMISO.PAGO_WRITE,
  PERMISO.REPORTE_COBRANZA_READ,
  PERMISO.REPORTE_OPERACION_READ,
];

export const PERMISOS_SUPERVISOR: PermisoCodigo[] = [
  ...PERMISOS_COBRADOR,
  PERMISO.CARTERA_WRITE,
  PERMISO.INTELIGENCIA_READ,
  PERMISO.EQUIPO_READ,
  PERMISO.LIQUIDACION_READ,
  PERMISO.PAGO_APPLY,
  PERMISO.REPORTE_RIESGO_READ,
  PERMISO.REPORTE_EQUIPO_READ,
];

export const PERMISOS_GERENTE: PermisoCodigo[] = [
  ...PERMISOS_SUPERVISOR,
  PERMISO.LIQUIDACION_WRITE,
  PERMISO.USER_READ,
  PERMISO.REPORTE_FINANZAS_READ,
  PERMISO.REPORTE_GERENCIAL_READ,
];

export const PERMISOS_ADMIN: PermisoCodigo[] = PERMISOS_CATALOGO.map(
  (p) => p.codigo,
);
