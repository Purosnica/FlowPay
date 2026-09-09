import { builder, type GraphQLContext } from '../../builder';
import { authCatalogoEscritura } from '@/lib/graphql/auth-helpers';
import { cacheDelete } from '@/lib/cache/cache-store';
import { spreadPrismaQuery } from '../../helpers/prisma-query';
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

builder.mutationField('createCodigoAccion', (t) => t.prismaField({
  type: CodigoAccion, args: { input: t.arg({ type: CreateCodigoAccionInput, required: true }) },
  resolve: async (query, _p, args, ctx: GraphQLContext) => {
    await authCatalogoEscritura(ctx);
    const row = await ctx.prisma.tbl_codigo_accion.create({ ...spreadPrismaQuery(query), data: CreateCodigoAccionInputSchema.parse(args.input) });
    await invalidateCatalogos(); return row;
  },
}));

builder.mutationField('updateCodigoAccion', (t) => t.prismaField({
  type: CodigoAccion, args: { input: t.arg({ type: UpdateCodigoAccionInput, required: true }) },
  resolve: async (query, _p, args, ctx: GraphQLContext) => {
    await authCatalogoEscritura(ctx);
    const { idcodaccion, ...data } = UpdateCodigoAccionInputSchema.parse(args.input);
    const row = await ctx.prisma.tbl_codigo_accion.update({ ...spreadPrismaQuery(query), where: { idcodaccion }, data });
    await invalidateCatalogos(); return row;
  },
}));

builder.mutationField('createCodigoResultado', (t) => t.prismaField({
  type: CodigoResultado, args: { input: t.arg({ type: CreateCodigoResultadoInput, required: true }) },
  resolve: async (query, _p, args, ctx: GraphQLContext) => {
    await authCatalogoEscritura(ctx);
    const row = await ctx.prisma.tbl_codigo_resultado.create({ ...spreadPrismaQuery(query), data: CreateCodigoResultadoInputSchema.parse(args.input) });
    await invalidateCatalogos(); return row;
  },
}));

builder.mutationField('updateCodigoResultado', (t) => t.prismaField({
  type: CodigoResultado, args: { input: t.arg({ type: UpdateCodigoResultadoInput, required: true }) },
  resolve: async (query, _p, args, ctx: GraphQLContext) => {
    await authCatalogoEscritura(ctx);
    const { idcodresultado, ...data } = UpdateCodigoResultadoInputSchema.parse(args.input);
    const row = await ctx.prisma.tbl_codigo_resultado.update({ ...spreadPrismaQuery(query), where: { idcodresultado }, data });
    await invalidateCatalogos(); return row;
  },
}));
