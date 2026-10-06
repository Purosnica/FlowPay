import { builder, type GraphQLContext } from '../../builder';
import { Prisma } from '@prisma/client';
import { authCatalogoEscritura } from '@/lib/graphql/auth-helpers';
import { cacheDelete } from '@/lib/cache/cache-store';
import { spreadPrismaQuery } from '../../helpers/prisma-query';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import {
  CodigoAccion, CodigoResultado, CreateCodigoAccionInput, CreateCodigoAccionInputSchema,
  UpdateCodigoAccionInput, UpdateCodigoAccionInputSchema, CreateCodigoResultadoInput,
  CreateCodigoResultadoInputSchema, UpdateCodigoResultadoInput, UpdateCodigoResultadoInputSchema,
} from './types';

async function invalidateCatalogos() {
  await Promise.all([
    cacheDelete('gql:codigosAccion'),
    cacheDelete('gql:codigosAccion:all'),
    cacheDelete('gql:codigosResultado:all'),
    cacheDelete('gql:codigosResultado:all:all'),
    cacheDelete('catalog:tipificaciones-estados'),
  ]);
}

/**
 * Prisma no debe llegar al cliente como un error enmascarado de Yoga.  En
 * particular, P2002 era mostrado como "Unexpected error." al editar un
 * código, sin dar al usuario una acción concreta para resolverlo.
 */
function manejarErrorCatalogo(
  error: unknown,
  entidad: 'acción' | 'resultado',
  operacion: 'crear' | 'actualizar',
): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new GraphQLValidationError(
        `Ya existe un código de ${entidad} con ese valor.`,
      );
    }

    if (error.code === 'P2025') {
      throw new GraphQLValidationError(
        `El código de ${entidad} ya no existe o fue eliminado. Actualice la página e inténtelo de nuevo.`,
      );
    }
  }

  throw new GraphQLValidationError(
    `No se pudo ${operacion} el código de ${entidad}. Inténtelo de nuevo.`,
  );
}

builder.mutationField('createCodigoAccion', (t) => t.prismaField({
  type: CodigoAccion, args: { input: t.arg({ type: CreateCodigoAccionInput, required: true }) },
  resolve: async (query, _p, args, ctx: GraphQLContext) => {
    await authCatalogoEscritura(ctx);
    try {
      const row = await ctx.prisma.tbl_codigo_accion.create({ ...spreadPrismaQuery(query), data: CreateCodigoAccionInputSchema.parse(args.input) });
      await invalidateCatalogos(); return row;
    } catch (error) {
      manejarErrorCatalogo(error, 'acción', 'crear');
    }
  },
}));

builder.mutationField('updateCodigoAccion', (t) => t.prismaField({
  type: CodigoAccion, args: { input: t.arg({ type: UpdateCodigoAccionInput, required: true }) },
  resolve: async (query, _p, args, ctx: GraphQLContext) => {
    await authCatalogoEscritura(ctx);
    try {
      const { idcodaccion, ...data } = UpdateCodigoAccionInputSchema.parse(args.input);
      const row = await ctx.prisma.tbl_codigo_accion.update({ ...spreadPrismaQuery(query), where: { idcodaccion }, data });
      await invalidateCatalogos(); return row;
    } catch (error) {
      manejarErrorCatalogo(error, 'acción', 'actualizar');
    }
  },
}));

builder.mutationField('createCodigoResultado', (t) => t.prismaField({
  type: CodigoResultado, args: { input: t.arg({ type: CreateCodigoResultadoInput, required: true }) },
  resolve: async (query, _p, args, ctx: GraphQLContext) => {
    await authCatalogoEscritura(ctx);
    try {
      const row = await ctx.prisma.tbl_codigo_resultado.create({ ...spreadPrismaQuery(query), data: CreateCodigoResultadoInputSchema.parse(args.input) });
      await invalidateCatalogos(); return row;
    } catch (error) {
      manejarErrorCatalogo(error, 'resultado', 'crear');
    }
  },
}));

builder.mutationField('updateCodigoResultado', (t) => t.prismaField({
  type: CodigoResultado, args: { input: t.arg({ type: UpdateCodigoResultadoInput, required: true }) },
  resolve: async (query, _p, args, ctx: GraphQLContext) => {
    await authCatalogoEscritura(ctx);
    try {
      const { idcodresultado, ...data } = UpdateCodigoResultadoInputSchema.parse(args.input);
      const row = await ctx.prisma.tbl_codigo_resultado.update({ ...spreadPrismaQuery(query), where: { idcodresultado }, data });
      await invalidateCatalogos(); return row;
    } catch (error) {
      manejarErrorCatalogo(error, 'resultado', 'actualizar');
    }
  },
}));
