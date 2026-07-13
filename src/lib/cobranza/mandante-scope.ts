/**
 * Scope de seguridad multi-mandante.
 * Filtra el acceso a datos según los mandantes asignados al usuario.
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ROL } from '@/lib/permissions/role-codes';
import { GraphQLPermissionError } from '@/lib/errors/graphql-errors';
import {
  esUsuarioCobrador,
  requerirAccesoClienteCobrador,
} from './cobrador-scope';

export async function esAdmin(idusuario: number): Promise<boolean> {
  const usuario = await prisma.tbl_usuario.findUnique({
    where: { idusuario },
    include: { rol: true },
  });
  return usuario?.rol?.codigo === ROL.ADMIN;
}

async function obtenerRolCodigo(
  idusuario: number,
): Promise<string | null> {
  const usuario = await prisma.tbl_usuario.findUnique({
    where: { idusuario },
    include: { rol: true },
  });
  return usuario?.rol?.codigo ?? null;
}

/**
 * Mandantes asignados a miembros del equipo (supervisor/gerente).
 * Evita dependencia circular con equipo-scope.
 */
async function obtenerMandantesIndirectosEquipo(
  idusuario: number,
  rolCodigo: string,
): Promise<number[]> {
  let idsEquipo: number[] = [];

  if (rolCodigo === ROL.SUPERVISOR) {
    const cobradores = await prisma.tbl_usuario.findMany({
      where: {
        idsupervisor: idusuario,
        activo: true,
        deletedAt: null,
        rol: { codigo: ROL.COBRADOR },
      },
      select: { idusuario: true },
    });
    idsEquipo = cobradores.map((c) => c.idusuario);
  } else if (rolCodigo === ROL.GERENTE) {
    const supervisores = await prisma.tbl_usuario.findMany({
      where: {
        idsupervisor: idusuario,
        activo: true,
        deletedAt: null,
        rol: { codigo: ROL.SUPERVISOR },
      },
      select: { idusuario: true },
    });
    const supervisorIds = supervisores.map((s) => s.idusuario);
    const cobradores = await prisma.tbl_usuario.findMany({
      where: {
        activo: true,
        deletedAt: null,
        idsupervisor: { in: [idusuario, ...supervisorIds] },
        rol: { codigo: ROL.COBRADOR },
      },
      select: { idusuario: true },
    });
    idsEquipo = [
      ...supervisorIds,
      ...cobradores.map((c) => c.idusuario),
    ];
  }

  if (idsEquipo.length === 0) {
    return [];
  }

  const mandantesEquipo = await prisma.tbl_usuario_mandante.findMany({
    where: { idusuario: { in: idsEquipo } },
    select: { idmandante: true },
    distinct: ['idmandante'],
  });

  return mandantesEquipo.map((m) => m.idmandante);
}

/**
 * Obtiene los IDs de mandante a los que tiene acceso el usuario.
 * Admin ve todos; supervisor/gerente incluyen mandantes de su equipo.
 */
export async function obtenerMandantesPermitidos(
  idusuario: number,
): Promise<number[]> {
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
  const idsDirectos = asignaciones.map((a) => a.idmandante);

  const rolCodigo = await obtenerRolCodigo(idusuario);
  if (rolCodigo === ROL.SUPERVISOR || rolCodigo === ROL.GERENTE) {
    const idsIndirectos = await obtenerMandantesIndirectosEquipo(
      idusuario,
      rolCodigo,
    );
    return [...new Set([...idsDirectos, ...idsIndirectos])];
  }

  return idsDirectos;
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

  await requerirAccesoClienteCobrador(idusuario, idcliente);
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
  const esCobrador = await esUsuarioCobrador(idusuario);
  return {
    prestamos: {
      some: {
        deletedAt: null,
        idmandante: mandanteFilter,
        ...(esCobrador ? { idgestorAsignado: idusuario } : {}),
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
  const esCobrador = await esUsuarioCobrador(idusuario);
  return {
    idcliente,
    deletedAt: null,
    idmandante: mandanteFilter,
    ...(esCobrador ? { idgestorAsignado: idusuario } : {}),
  };
}
