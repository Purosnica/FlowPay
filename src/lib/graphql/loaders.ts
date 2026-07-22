/**
 * Loaders por request GraphQL (I111 anti N+1).
 */

import type { prisma as prismaClient } from '@/lib/prisma';
import { createBatchLoader } from './batch-loader';

type PrismaClient = typeof prismaClient;

export type UsuarioLoaderItem = {
  idusuario: number;
  nombre: string;
};

export function createUsuarioLoader(db: PrismaClient) {
  return createBatchLoader<UsuarioLoaderItem>(async (ids) => {
    const rows = await db.tbl_usuario.findMany({
      where: { idusuario: { in: ids }, deletedAt: null },
      select: { idusuario: true, nombre: true },
    });
    return new Map(rows.map((r) => [r.idusuario, r]));
  });
}

export type GraphqlLoaders = {
  usuario: ReturnType<typeof createUsuarioLoader>;
};

export function createGraphqlLoaders(db: PrismaClient): GraphqlLoaders {
  return {
    usuario: createUsuarioLoader(db),
  };
}
