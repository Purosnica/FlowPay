/**
 * Mapa de rutas protegidas → permisos requeridos.
 * Orden: rutas más específicas primero.
 */

import { PERMISO } from '@/lib/permissions/permiso-codes';

export interface RoutePermissionRule {
  prefix: string;
  permiso?: string;
  permisos?: string[];
}

export const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  { prefix: '/cobranza/centro-inteligencia', permiso: PERMISO.INTELIGENCIA_READ },
  { prefix: '/cobranza/equipo', permiso: PERMISO.EQUIPO_READ },
  { prefix: '/cobranza/gamificacion', permiso: PERMISO.EQUIPO_READ },
  { prefix: '/cobranza/mi-dia', permiso: PERMISO.CARTERA_READ },
  { prefix: '/cobranza/importar', permiso: PERMISO.CARTERA_WRITE },
  { prefix: '/cobranza/asignacion', permiso: PERMISO.CARTERA_WRITE },
  { prefix: '/cobranza/historial-cargas', permiso: PERMISO.CARTERA_READ },
  { prefix: '/cobranza/campanas/wizard', permiso: PERMISO.CARTERA_WRITE },
  { prefix: '/cobranza/mandantes', permiso: PERMISO.MANDANTE_READ },
  { prefix: '/cobranza/plantillas', permiso: PERMISO.MANDANTE_READ },
  { prefix: '/cobranza/plantillas-mensaje', permiso: PERMISO.MANDANTE_WRITE },
  { prefix: '/cobranza/conciliaciones', permiso: PERMISO.PAGO_READ },
  { prefix: '/cobranza/liquidaciones', permiso: PERMISO.LIQUIDACION_READ },
  { prefix: '/cobranza/reportes', permiso: PERMISO.REPORTE_READ },
  { prefix: '/cobranza/informe-gerencial', permiso: PERMISO.REPORTE_READ },
  { prefix: '/cobranza/gestiones', permiso: PERMISO.GESTION_READ },
  { prefix: '/cobranza/bandeja', permiso: PERMISO.CARTERA_READ },
  { prefix: '/cobranza/campanas', permiso: PERMISO.CARTERA_READ },
  { prefix: '/cobranza/reclamos', permiso: PERMISO.GESTION_READ },
  { prefix: '/cobranza/agencias', permiso: PERMISO.CARTERA_READ },
  { prefix: '/cobranza/cartera', permiso: PERMISO.CARTERA_READ },
  { prefix: '/cobranza/prestamos', permiso: PERMISO.CARTERA_READ },
  { prefix: '/cobranza', permisos: [PERMISO.CARTERA_READ, PERMISO.GESTION_READ] },
  { prefix: '/configuracion/auditoria', permiso: PERMISO.CONFIG_SYSTEM },
  { prefix: '/configuracion/cron', permiso: PERMISO.CONFIG_SYSTEM },
  { prefix: '/configuracion/usuarios', permiso: PERMISO.USER_READ },
  { prefix: '/configuracion', permiso: PERMISO.CONFIG_SYSTEM },
  { prefix: '/dashboard', permiso: PERMISO.CARTERA_READ },
  { prefix: '/clientes', permiso: PERMISO.CARTERA_READ },
];

export function obtenerReglaPermisoRuta(
  pathname: string,
): RoutePermissionRule | null {
  for (const rule of ROUTE_PERMISSION_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule;
    }
  }
  return null;
}

export function usuarioTieneAccesoRuta(
  permisosUsuario: string[],
  rule: RoutePermissionRule,
): boolean {
  if (rule.permiso) {
    return permisosUsuario.includes(rule.permiso);
  }
  if (rule.permisos?.length) {
    return rule.permisos.some((p) => permisosUsuario.includes(p));
  }
  return true;
}
