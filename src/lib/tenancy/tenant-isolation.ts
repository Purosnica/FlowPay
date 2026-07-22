/**
 * Política de aislamiento multi-tenant (I008 / H21).
 * Hoy: row-level por idmandante. Schema-per-tenant = ADR futuro.
 */

import type { Prisma } from '@prisma/client';
import {
  filtroMandante,
  obtenerMandantesPermitidos,
  requerirAccesoCliente,
  requerirAccesoMandante,
} from '@/lib/cobranza/mandante-scope';

export const TENANT_ISOLATION_POLICY = 'ROW_LEVEL' as const;

export type TenantIsolationPolicy = typeof TENANT_ISOLATION_POLICY;

export function getTenantIsolationPolicy(): TenantIsolationPolicy {
  return TENANT_ISOLATION_POLICY;
}

/**
 * Wrapper tipado sobre el scope existente.
 */
export async function assertTenantAccess(
  idusuario: number | undefined,
  idmandante: number,
): Promise<void> {
  await requerirAccesoMandante(idusuario, idmandante);
}

export async function listTenantIdsForUser(
  idusuario: number,
): Promise<number[]> {
  return obtenerMandantesPermitidos(idusuario);
}

/**
 * Agencia es tenant-scoped (H21). Filtro Prisma por mandantes permitidos.
 */
export async function filtroAgenciaPorTenant(
  idusuario: number | null | undefined,
): Promise<Prisma.tbl_agenciaWhereInput> {
  if (!idusuario) {
    return { idagencia: { in: [] } };
  }
  const mandanteFilter = await filtroMandante(idusuario);
  return {
    deletedAt: null,
    idmandante: mandanteFilter ?? { in: [] },
  };
}

/**
 * Cliente permanece master compartido; acceso vía préstamos del tenant.
 */
export async function assertClienteTenantAccess(
  idusuario: number | undefined,
  idcliente: number,
): Promise<void> {
  await requerirAccesoCliente(idusuario, idcliente);
}
