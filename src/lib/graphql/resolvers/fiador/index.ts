import {
  Fiador,
  CreateFiadorInput,
  UpdateFiadorInput,
  CreateFiadorInputSchema,
  UpdateFiadorInputSchema,
} from './types';
import { builder ,type  GraphQLContext } from '../../builder';


import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { createPageType } from '../../helpers/create-page-type';
import { resolvePaginatedPrismaQuery } from '../../helpers/paginated-prisma-resolver';

const FiadorPage = createPageType('FiadorPage', Fiador, 'fiadores');

builder.queryField('fiadores', (t) =>
  t.field({
    type: FiadorPage,
    args: {
      idprestamo: t.arg.int({ required: true }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
        where: { idprestamo: args.idprestamo },
      });
      if (!prestamo || prestamo.deletedAt) {
        throw new GraphQLValidationError('Préstamo no encontrado.');
      }
      await requerirAccesoMandante(ctx.usuario?.idusuario, prestamo.idmandante);

      const where = { idprestamo: args.idprestamo, deletedAt: null };

      return resolvePaginatedPrismaQuery({
        page: args.page,
        pageSize: args.pageSize,
        itemsFieldName: 'fiadores',
        findMany: (skip, take) =>
          ctx.prisma.tbl_fiador.findMany({
            where,
            skip,
            take,
            orderBy: { nombre: 'asc' },
          }),
        count: () => ctx.prisma.tbl_fiador.count({ where }),
      }) as never;
    },
  }),
);

builder.mutationField('createFiador', (t) =>
  t.prismaField({
    type: Fiador,
    args: { input: t.arg({ type: CreateFiadorInput, required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const data = CreateFiadorInputSchema.parse(args.input);
      const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
        where: { idprestamo: data.idprestamo },
      });
      if (!prestamo || prestamo.deletedAt) {
        throw new GraphQLValidationError('Préstamo no encontrado.');
      }
      await requerirAccesoMandante(ctx.usuario?.idusuario, prestamo.idmandante);
      return ctx.prisma.tbl_fiador.create({
        ...(query as Record<string, unknown>),
        data,
      }) as never;
    },
  }),
);

builder.mutationField('updateFiador', (t) =>
  t.prismaField({
    type: Fiador,
    args: { input: t.arg({ type: UpdateFiadorInput, required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const { idfiador, ...updateData } = UpdateFiadorInputSchema.parse(
        args.input,
      );
      const existente = await ctx.prisma.tbl_fiador.findUnique({
        where: { idfiador },
        include: { prestamo: true },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Fiador no encontrado.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        existente.prestamo.idmandante,
      );
      return ctx.prisma.tbl_fiador.update({
        ...(query as Record<string, unknown>),
        where: { idfiador },
        data: updateData,
      }) as never;
    },
  }),
);

builder.mutationField('deleteFiador', (t) =>
  t.field({
    type: 'Boolean',
    args: { idfiador: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const existente = await ctx.prisma.tbl_fiador.findUnique({
        where: { idfiador: args.idfiador },
        include: { prestamo: true },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Fiador no encontrado.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        existente.prestamo.idmandante,
      );
      await ctx.prisma.tbl_fiador.update({
        where: { idfiador: args.idfiador },
        data: { deletedAt: new Date() },
      });
      return true;
    },
  }),
);
