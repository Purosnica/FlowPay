/**
 * Scope de datos para el rol COBRADOR.
 * Limita cartera, clientes y gestiones a la asignación del gestor.
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ROL } from '@/lib/permissions/role-codes';
import { GraphQLPermissionError } from '@/lib/errors/graphql-errors';

export async function esUsuarioCobrador(
  idusuario: number,
): Promise<boolean> {
  const usuario = await prisma.tbl_usuario.findUnique({
    where: { idusuario },
    include: { rol: true },
  });
  return usuario?.rol?.codigo === ROL.COBRADOR;
}

export async function wherePrestamoPorRol(
  idusuario: number,
): Promise<Prisma.tbl_prestamoWhereInput> {
  if (await esUsuarioCobrador(idusuario)) {
    return { idgestorAsignado: idusuario };
  }
  return {};
}

export async function whereGestionPorRol(
  idusuario: number,
): Promise<Prisma.tbl_gestionWhereInput> {
  if (await esUsuarioCobrador(idusuario)) {
    return { idgestor: idusuario };
  }
  return {};
}

export async function requerirAccesoPrestamoCobrador(
  idusuario: number | null | undefined,
  idprestamo: number,
): Promise<void> {
  if (!idusuario || !(await esUsuarioCobrador(idusuario))) {
    return;
  }

  const prestamo = await prisma.tbl_prestamo.findUnique({
    where: { idprestamo },
    select: { idgestorAsignado: true, deletedAt: true },
  });

  if (!prestamo || prestamo.deletedAt) {
    throw new GraphQLPermissionError('No tienes acceso a este préstamo.');
  }

  if (prestamo.idgestorAsignado !== idusuario) {
    throw new GraphQLPermissionError('No tienes acceso a este préstamo.');
  }
}

export async function requerirAccesoClienteCobrador(
  idusuario: number | null | undefined,
  idcliente: number,
): Promise<void> {
  if (!idusuario || !(await esUsuarioCobrador(idusuario))) {
    return;
  }

  const asignado = await prisma.tbl_prestamo.findFirst({
    where: {
      idcliente,
      deletedAt: null,
      idgestorAsignado: idusuario,
    },
    select: { idprestamo: true },
  });

  if (!asignado) {
    throw new GraphQLPermissionError('No tienes acceso a este cliente.');
  }
}
