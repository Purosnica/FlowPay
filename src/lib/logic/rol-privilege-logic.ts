/**
 * Jerarquía de privilegios de rol (anti-escalada H06).
 */

import { ROL, type RolCodigo } from '@/lib/permissions/role-codes';

const RANGO_ROL: Record<string, number> = {
  [ROL.COBRADOR]: 1,
  [ROL.SUPERVISOR]: 2,
  [ROL.GERENTE]: 3,
  [ROL.ADMIN]: 4,
};

export function rangoRol(codigo: string | null | undefined): number {
  if (!codigo) {
    return 0;
  }
  return RANGO_ROL[codigo] ?? 0;
}

/** Roles de sistema cuyo permiso set solo puede editar un ADMIN. */
export function esRolSistemaProtegido(
  codigo: string | null | undefined,
): boolean {
  return codigo === ROL.ADMIN || codigo === ROL.GERENTE;
}

/**
 * Un actor solo puede asignar roles de rango estrictamente menor,
 * salvo ADMIN que puede asignar cualquiera.
 */
export function puedeAsignarRol(params: {
  codigoActor: string | null | undefined;
  codigoRolObjetivo: string | null | undefined;
}): boolean {
  const actor = params.codigoActor;
  const objetivo = params.codigoRolObjetivo;
  if (!actor || !objetivo) {
    return false;
  }
  if (actor === ROL.ADMIN) {
    return true;
  }
  if (objetivo === ROL.ADMIN) {
    return false;
  }
  return rangoRol(actor) > rangoRol(objetivo);
}

export function puedeEditarPermisosDelRol(params: {
  codigoActor: string | null | undefined;
  codigoRolObjetivo: string | null | undefined;
}): boolean {
  const actor = params.codigoActor;
  if (actor === ROL.ADMIN) {
    return true;
  }
  if (esRolSistemaProtegido(params.codigoRolObjetivo)) {
    return false;
  }
  return rangoRol(actor) >= rangoRol(ROL.GERENTE);
}

export function assertPuedeAsignarRol(params: {
  codigoActor: string | null | undefined;
  codigoRolObjetivo: string | null | undefined;
}): void {
  if (!puedeAsignarRol(params)) {
    throw new Error(
      'No tiene privilegios para asignar ese rol (anti-escalada).',
    );
  }
}

export function assertPuedeEditarPermisosRol(params: {
  codigoActor: string | null | undefined;
  codigoRolObjetivo: string | null | undefined;
}): void {
  if (!puedeEditarPermisosDelRol(params)) {
    throw new Error(
      'No tiene privilegios para modificar permisos de ese rol.',
    );
  }
}

export type { RolCodigo };
