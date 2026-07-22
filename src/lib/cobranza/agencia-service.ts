/**
 * CRUD de agencias y rutas (catálogo operativo por mandante — H21).
 */

import type { tbl_agencia, tbl_ruta } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';

export async function crearAgencia(params: {
  idmandante: number;
  codigo: string;
  nombre: string;
  estado?: boolean;
  idusuario: number;
}): Promise<tbl_agencia> {
  await requerirAccesoMandante(params.idusuario, params.idmandante);

  const codigo = params.codigo.trim().toUpperCase();
  const nombre = params.nombre.trim();
  if (!codigo || !nombre) {
    throw new GraphQLValidationError('Código y nombre son requeridos.');
  }

  const existente = await prisma.tbl_agencia.findFirst({
    where: {
      idmandante: params.idmandante,
      codigo,
      deletedAt: null,
    },
  });
  if (existente) {
    throw new GraphQLValidationError(
      `Ya existe una agencia con código ${codigo} en este mandante.`,
    );
  }

  return prisma.tbl_agencia.create({
    data: {
      idmandante: params.idmandante,
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
  idusuario: number;
}): Promise<tbl_agencia> {
  const existente = await prisma.tbl_agencia.findFirst({
    where: { idagencia: params.idagencia, deletedAt: null },
  });
  if (!existente) {
    throw new GraphQLValidationError('Agencia no encontrada.');
  }
  await requerirAccesoMandante(params.idusuario, existente.idmandante);

  const codigo =
    params.codigo !== undefined
      ? params.codigo.trim().toUpperCase()
      : undefined;
  const nombre =
    params.nombre !== undefined ? params.nombre.trim() : undefined;

  if (codigo && codigo !== existente.codigo) {
    const conflicto = await prisma.tbl_agencia.findFirst({
      where: {
        idmandante: existente.idmandante,
        codigo,
        deletedAt: null,
        idagencia: { not: params.idagencia },
      },
    });
    if (conflicto) {
      throw new GraphQLValidationError(
        `Ya existe una agencia con código ${codigo} en este mandante.`,
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

export async function eliminarAgencia(
  idagencia: number,
  idusuario: number,
): Promise<boolean> {
  const existente = await prisma.tbl_agencia.findFirst({
    where: { idagencia, deletedAt: null },
  });
  if (!existente) {
    throw new GraphQLValidationError('Agencia no encontrada.');
  }
  await requerirAccesoMandante(idusuario, existente.idmandante);

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
  idusuario: number;
}): Promise<tbl_ruta> {
  const agencia = await prisma.tbl_agencia.findFirst({
    where: { idagencia: params.idagencia, deletedAt: null },
  });
  if (!agencia) {
    throw new GraphQLValidationError('Agencia no encontrada.');
  }
  await requerirAccesoMandante(params.idusuario, agencia.idmandante);

  return prisma.tbl_ruta.create({
    data: {
      idagencia: params.idagencia,
      nombre: params.nombre.trim(),
      estado: params.estado ?? true,
    },
  });
}

export async function actualizarRuta(params: {
  idruta: number;
  idagencia?: number;
  nombre?: string;
  estado?: boolean;
  idusuario: number;
}): Promise<tbl_ruta> {
  const existente = await prisma.tbl_ruta.findFirst({
    where: { idruta: params.idruta, deletedAt: null },
    include: { agencia: true },
  });
  if (!existente) {
    throw new GraphQLValidationError('Ruta no encontrada.');
  }
  await requerirAccesoMandante(params.idusuario, existente.agencia.idmandante);

  if (params.idagencia !== undefined) {
    const agencia = await prisma.tbl_agencia.findFirst({
      where: { idagencia: params.idagencia, deletedAt: null },
    });
    if (!agencia) {
      throw new GraphQLValidationError('Agencia destino no encontrada.');
    }
    await requerirAccesoMandante(params.idusuario, agencia.idmandante);
  }

  return prisma.tbl_ruta.update({
    where: { idruta: params.idruta },
    data: {
      ...(params.idagencia !== undefined ? { idagencia: params.idagencia } : {}),
      ...(params.nombre !== undefined ? { nombre: params.nombre.trim() } : {}),
      ...(params.estado !== undefined ? { estado: params.estado } : {}),
    },
  });
}

export async function eliminarRuta(
  idruta: number,
  idusuario: number,
): Promise<boolean> {
  const existente = await prisma.tbl_ruta.findFirst({
    where: { idruta, deletedAt: null },
    include: { agencia: true },
  });
  if (!existente) {
    throw new GraphQLValidationError('Ruta no encontrada.');
  }
  await requerirAccesoMandante(idusuario, existente.agencia.idmandante);

  await prisma.tbl_ruta.update({
    where: { idruta },
    data: { deletedAt: new Date(), estado: false },
  });
  return true;
}
