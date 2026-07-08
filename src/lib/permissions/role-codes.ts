/**
 * Códigos de rol del sistema.
 * Usar para jerarquía organizacional (supervisor → gerente → admin),
 * NO para autorización de módulos (eso es RBAC vía permisos).
 */

export const ROL = {
  ADMIN: 'ADMIN',
  GERENTE: 'GERENTE',
  SUPERVISOR: 'SUPERVISOR',
  COBRADOR: 'COBRADOR',
} as const;

export type RolCodigo = (typeof ROL)[keyof typeof ROL];

export function esRolCobrador(codigo: string | null | undefined): boolean {
  return codigo === ROL.COBRADOR;
}

export function esRolGerente(codigo: string | null | undefined): boolean {
  return codigo === ROL.GERENTE || codigo === ROL.ADMIN;
}

export function esRolSupervisor(codigo: string | null | undefined): boolean {
  return (
    codigo === ROL.SUPERVISOR ||
    codigo === ROL.GERENTE ||
    codigo === ROL.ADMIN
  );
}
