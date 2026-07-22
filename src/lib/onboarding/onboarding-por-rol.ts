/**
 * Onboarding interactivo por rol con progreso medible (I046).
 */

import { ROL, type RolCodigo } from '@/lib/permissions/role-codes';
import {
  ESTADO_ONBOARDING_INICIAL,
  PASOS_ONBOARDING_COBRADOR,
  type EstadoOnboarding,
  type PasoOnboarding,
} from '@/lib/onboarding/cobrador-onboarding';

export type { EstadoOnboarding, PasoOnboarding };

export const PASOS_ONBOARDING_SUPERVISOR: PasoOnboarding[] = [
  {
    id: 'equipo',
    titulo: 'Revisa el desempeño del equipo',
    descripcion:
      'El ranking y Mi día te dan la foto del turno. Úsalos al inicio de la jornada.',
    href: '/cobranza/mi-dia',
    ctaLabel: 'Ver operación',
  },
  {
    id: 'asignacion',
    titulo: 'Asigna o rebalancea cartera',
    descripcion:
      'Distribuye casos a cobradores con asignación manual o automática.',
    href: '/cobranza/asignacion',
    ctaLabel: 'Ir a asignación',
  },
  {
    id: 'bandeja-equipo',
    titulo: 'Supervisa la bandeja',
    descripcion:
      'Filtra por gestor y tramo de mora para detectar cuellos de botella.',
    href: '/cobranza/bandeja',
    ctaLabel: 'Abrir bandeja',
  },
  {
    id: 'reportes',
    titulo: 'Consulta el hub de reportes',
    descripcion:
      'Aging, recuperación y comisiones viven en un solo hub filtrable.',
    href: '/cobranza/reportes',
    ctaLabel: 'Abrir reportes',
  },
];

export const PASOS_ONBOARDING_GERENTE: PasoOnboarding[] = [
  {
    id: 'dashboard',
    titulo: 'Empieza por el dashboard',
    descripcion:
      'KPIs de cartera, mora y recuperación en una sola vista ejecutiva.',
    href: '/dashboard',
    ctaLabel: 'Ir al dashboard',
  },
  {
    id: 'reportes-gerencia',
    titulo: 'Hub de inteligencia',
    descripcion:
      'Explora aging, forecast y reportes de equipo desde el catálogo.',
    href: '/cobranza/reportes',
    ctaLabel: 'Ver reportes',
  },
  {
    id: 'liquidaciones',
    titulo: 'Revisa liquidaciones',
    descripcion:
      'Simula, emite y controla liquidaciones a mandantes por periodo.',
    href: '/cobranza/liquidaciones',
    ctaLabel: 'Liquidaciones',
  },
  {
    id: 'config',
    titulo: 'Configuración de cobranza',
    descripcion:
      'Umbrales de castigo, horarios y políticas que afectan a toda la operación.',
    href: '/cobranza/configuracion',
    ctaLabel: 'Configurar',
  },
];

export const PASOS_ONBOARDING_ADMIN: PasoOnboarding[] = [
  {
    id: 'usuarios',
    titulo: 'Gestiona usuarios y roles',
    descripcion:
      'Alta de cobradores, supervisores y permisos RBAC del sistema.',
    href: '/usuarios',
    ctaLabel: 'Usuarios',
  },
  {
    id: 'mandantes',
    titulo: 'Configura mandantes',
    descripcion:
      'Cada mandante define plantillas, tipificaciones y comisiones.',
    href: '/cobranza/mandantes',
    ctaLabel: 'Mandantes',
  },
  {
    id: 'importar',
    titulo: 'Importa la primera cartera',
    descripcion:
      'Carga Excel, revisa el preview y confirma para poblar préstamos.',
    href: '/cobranza/importar',
    ctaLabel: 'Importar',
  },
  {
    id: 'seguridad',
    titulo: 'Revisa tu perfil y MFA',
    descripcion:
      'Activa autenticación en dos pasos si tu rol lo requiere.',
    href: '/perfil',
    ctaLabel: 'Abrir perfil',
  },
];

const STORAGE_PREFIX = 'flowpay_onboarding';

export function pasosOnboardingPorRol(
  rolCodigo: string | null | undefined,
): PasoOnboarding[] {
  switch (rolCodigo) {
    case ROL.COBRADOR:
      return PASOS_ONBOARDING_COBRADOR;
    case ROL.SUPERVISOR:
      return PASOS_ONBOARDING_SUPERVISOR;
    case ROL.GERENTE:
      return PASOS_ONBOARDING_GERENTE;
    case ROL.ADMIN:
      return PASOS_ONBOARDING_ADMIN;
    default:
      return PASOS_ONBOARDING_COBRADOR;
  }
}

export function claveOnboardingRol(
  idusuario: number,
  rolCodigo: string,
): string {
  return `${STORAGE_PREFIX}_${rolCodigo.toLowerCase()}_${idusuario}`;
}

/** Migración: cobrador usaba clave legacy sin rol. */
export function claveOnboardingLegacyCobrador(idusuario: number): string {
  return `flowpay_onboarding_cobrador_${idusuario}`;
}

export function rolTieneOnboarding(
  rolCodigo: string | null | undefined,
): rolCodigo is RolCodigo {
  return (
    rolCodigo === ROL.COBRADOR ||
    rolCodigo === ROL.SUPERVISOR ||
    rolCodigo === ROL.GERENTE ||
    rolCodigo === ROL.ADMIN
  );
}

export { ESTADO_ONBOARDING_INICIAL };
