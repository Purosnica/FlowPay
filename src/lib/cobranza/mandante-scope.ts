/**
 * Scope de seguridad multi-mandante.
 * Filtra el acceso a datos según los mandantes asignados al usuario.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROL } from "@/lib/permissions/role-codes";
import { GraphQLPermissionError } from "@/lib/errors/graphql-errors";

export async function esAdmin(idusuario: number): Promise<boolean> {
  const usuario = await prisma.tbl_usuario.findUnique({
    where: { idusuario },
    include: { rol: true },
  });
  return usuario?.rol?.codigo === ROL.ADMIN;
}

/**
 * Obtiene los IDs de mandante a los que tiene acceso el usuario.
 * Admin ve todos; el resto solo los asignados en tbl_usuario_mandante.
 */
export async function obtenerMandantesPermitidos(idusuario: number): Promise<number[]> {
  if (await esAdmin(idusuario)) {
    const mandantes = await prisma.tbl_mandante.findMany({
      where: { estado: true, deletedAt: null },
      select: { idmandante: true },
    });
    return mandantes.map((m) => m.idmandante);
  }

  const asignaciones = await prisma.tbl_usuario_mandante.findMany({
    where: { idusuario },
    select: { idmandante: true },
  });
  return asignaciones.map((a) => a.idmandante);
}

/**
 * Filtro Prisma para entidades con idmandante.
 */
export async function filtroMandante(
  idusuario: number | null | undefined,
): Promise<Prisma.IntFilter | undefined> {
  if (!idusuario) {
    return { in: [] };
  }
  const ids = await obtenerMandantesPermitidos(idusuario);
  return { in: ids };
}

/**
 * Verifica acceso a un mandante específico. Lanza error si no tiene permiso.
 */
export async function requerirAccesoMandante(
  idusuario: number | null | undefined,
  idmandante: number,
): Promise<void> {
  if (!idusuario) {
    throw new GraphQLPermissionError("Debes estar autenticado para acceder a este recurso.");
  }
  const permitidos = await obtenerMandantesPermitidos(idusuario);
  if (!permitidos.includes(idmandante)) {
    throw new GraphQLPermissionError(
      "No tienes acceso al mandante solicitado.",
    );
  }
}

/**
 * Verifica acceso a un cliente vía sus préstamos y mandantes asignados.
 */
export async function requerirAccesoCliente(
  idusuario: number | null | undefined,
  idcliente: number,
): Promise<void> {
  if (!idusuario) {
    throw new GraphQLPermissionError(
      'Debes estar autenticado para acceder a este recurso.',
    );
  }

  const mandantesCliente = await prisma.tbl_prestamo.findMany({
    where: { idcliente, deletedAt: null },
    select: { idmandante: true },
    distinct: ['idmandante'],
  });

  if (mandantesCliente.length === 0) {
    if (!(await esAdmin(idusuario))) {
      throw new GraphQLPermissionError('No tienes acceso a este cliente.');
    }
    return;
  }

  const permitidos = await obtenerMandantesPermitidos(idusuario);
  const tieneAcceso = mandantesCliente.some((m) =>
    permitidos.includes(m.idmandante),
  );
  if (!tieneAcceso) {
    throw new GraphQLPermissionError('No tienes acceso a este cliente.');
  }
}

/**
 * Filtro Prisma para listar clientes con préstamos en mandantes permitidos.
 * Admin: sin restricción adicional.
 */
export async function filtroClientePorMandante(
  idusuario: number | null | undefined,
): Promise<Prisma.tbl_clienteWhereInput | undefined> {
  if (!idusuario) {
    return { idcliente: { in: [] } };
  }
  if (await esAdmin(idusuario)) {
    return undefined;
  }
  const mandanteFilter = await filtroMandante(idusuario);
  return {
    prestamos: {
      some: {
        deletedAt: null,
        idmandante: mandanteFilter,
      },
    },
  };
}

/**
 * Condición Prisma para préstamos de un cliente dentro del scope mandante.
 */
export async function wherePrestamoClienteEnScope(
  idusuario: number,
  idcliente: number,
): Promise<Prisma.tbl_prestamoWhereInput> {
  const mandanteFilter = await filtroMandante(idusuario);
  return {
    idcliente,
    deletedAt: null,
    idmandante: mandanteFilter,
  };
}
