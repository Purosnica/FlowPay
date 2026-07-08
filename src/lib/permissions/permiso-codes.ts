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
  LIQUIDACION_READ: 'LIQUIDACION_READ',
  LIQUIDACION_WRITE: 'LIQUIDACION_WRITE',
  REPORTE_READ: 'REPORTE_READ',
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
    nombre: 'Ver Reportes',
    descripcion: 'Consultar reportes analíticos de cobranza',
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
  PERMISO.REPORTE_READ,
];

export const PERMISOS_SUPERVISOR: PermisoCodigo[] = [
  ...PERMISOS_COBRADOR,
  PERMISO.CARTERA_WRITE,
  PERMISO.INTELIGENCIA_READ,
  PERMISO.EQUIPO_READ,
  PERMISO.LIQUIDACION_READ,
];

export const PERMISOS_GERENTE: PermisoCodigo[] = [
  ...PERMISOS_SUPERVISOR,
  PERMISO.LIQUIDACION_WRITE,
  PERMISO.USER_READ,
];

export const PERMISOS_ADMIN: PermisoCodigo[] = PERMISOS_CATALOGO.map(
  (p) => p.codigo,
);
