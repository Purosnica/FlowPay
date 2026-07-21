/**
 * CRUD de agencias y rutas (catálogo operativo).
 */

import type { tbl_agencia, tbl_ruta } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';

export async function crearAgencia(params: {
  codigo: string;
  nombre: string;
  estado?: boolean;
}): Promise<tbl_agencia> {
  const codigo = params.codigo.trim().toUpperCase();
  const nombre = params.nombre.trim();
  if (!codigo || !nombre) {
    throw new GraphQLValidationError('Código y nombre son requeridos.');
  }

  const existente = await prisma.tbl_agencia.findFirst({
    where: { codigo, deletedAt: null },
  });
  if (existente) {
    throw new GraphQLValidationError(
      `Ya existe una agencia con código ${codigo}.`,
    );
  }

  return prisma.tbl_agencia.create({
    data: {
      codigo,
      nombre,
      estado: params.estado ?? true,
    },
  });
}

export async function actualizarAgencia(params: {
  idagencia: number;
  codigo?: string;
  nombre?: string;
  estado?: boolean;
}): Promise<tbl_agencia> {
  const existente = await prisma.tbl_agencia.findFirst({
    where: { idagencia: params.idagencia, deletedAt: null },
  });
  if (!existente) {
    throw new GraphQLValidationError('Agencia no encontrada.');
  }

  const codigo =
    params.codigo !== undefined
      ? params.codigo.trim().toUpperCase()
      : undefined;
  const nombre =
    params.nombre !== undefined ? params.nombre.trim() : undefined;

  if (codigo && codigo !== existente.codigo) {
    const conflicto = await prisma.tbl_agencia.findFirst({
      where: {
        codigo,
        deletedAt: null,
        idagencia: { not: params.idagencia },
      },
    });
    if (conflicto) {
      throw new GraphQLValidationError(
        `Ya existe una agencia con código ${codigo}.`,
      );
    }
  }

  return prisma.tbl_agencia.update({
    where: { idagencia: params.idagencia },
    data: {
      ...(codigo !== undefined ? { codigo } : {}),
      ...(nombre !== undefined ? { nombre } : {}),
      ...(params.estado !== undefined ? { estado: params.estado } : {}),
    },
  });
}

export async function eliminarAgencia(idagencia: number): Promise<boolean> {
  const existente = await prisma.tbl_agencia.findFirst({
    where: { idagencia, deletedAt: null },
  });
  if (!existente) {
    throw new GraphQLValidationError('Agencia no encontrada.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.tbl_ruta.updateMany({
      where: { idagencia, deletedAt: null },
      data: { deletedAt: new Date(), estado: false },
    });
    await tx.tbl_agencia.update({
      where: { idagencia },
      data: { deletedAt: new Date(), estado: false },
    });
  });

  return true;
}

export async function crearRuta(params: {
  idagencia: number;
  nombre: string;
  estado?: boolean;
}): Promise<tbl_ruta> {
  const nombre = params.nombre.trim();
  if (!nombre) {
    throw new GraphQLValidationError('Nombre de ruta requerido.');
  }

  const agencia = await prisma.tbl_agencia.findFirst({
    where: { idagencia: params.idagencia, deletedAt: null },
  });
  if (!agencia) {
    throw new GraphQLValidationError('Agencia no encontrada.');
  }

  return prisma.tbl_ruta.create({
    data: {
      idagencia: params.idagencia,
      nombre,
      estado: params.estado ?? true,
    },
  });
}

export async function actualizarRuta(params: {
  idruta: number;
  idagencia?: number;
  nombre?: string;
  estado?: boolean;
}): Promise<tbl_ruta> {
  const existente = await prisma.tbl_ruta.findFirst({
    where: { idruta: params.idruta, deletedAt: null },
  });
  if (!existente) {
    throw new GraphQLValidationError('Ruta no encontrada.');
  }

  if (params.idagencia !== undefined) {
    const agencia = await prisma.tbl_agencia.findFirst({
      where: { idagencia: params.idagencia, deletedAt: null },
    });
    if (!agencia) {
      throw new GraphQLValidationError('Agencia no encontrada.');
    }
  }

  const nombre =
    params.nombre !== undefined ? params.nombre.trim() : undefined;

  return prisma.tbl_ruta.update({
    where: { idruta: params.idruta },
    data: {
      ...(params.idagencia !== undefined ? { idagencia: params.idagencia } : {}),
      ...(nombre !== undefined ? { nombre } : {}),
      ...(params.estado !== undefined ? { estado: params.estado } : {}),
    },
  });
}

export async function eliminarRuta(idruta: number): Promise<boolean> {
  const existente = await prisma.tbl_ruta.findFirst({
    where: { idruta, deletedAt: null },
  });
  if (!existente) {
    throw new GraphQLValidationError('Ruta no encontrada.');
  }

  await prisma.tbl_ruta.update({
    where: { idruta },
    data: { deletedAt: new Date(), estado: false },
  });
  return true;
}
