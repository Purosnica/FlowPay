import {
  ContratoMandante,
  CreateContratoMandanteInput,
  UpdateContratoMandanteInput,
  CreateContratoMandanteInputSchema,
  UpdateContratoMandanteInputSchema,
} from './types';
import { builder ,type  GraphQLContext } from '../../builder';


import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { createPageType } from '../../helpers/create-page-type';
import { resolvePaginatedPrismaQuery } from '../../helpers/paginated-prisma-resolver';
import { IdPositiveSchema } from '@/lib/validators/graphql-args';
import { z } from 'zod';

const ContratoMandantePage = createPageType(
  'ContratoMandantePage',
  ContratoMandante,
  'contratos',
);

builder.queryField('contratosMandante', (t) =>
  t.field({
    type: ContratoMandantePage,
    args: {
      idmandante: t.arg.int({ required: true }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_READ);
      await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);

      const where = { idmandante: args.idmandante, deletedAt: null };

      return resolvePaginatedPrismaQuery({
        page: args.page,
        pageSize: args.pageSize,
        itemsFieldName: 'contratos',
        findMany: (skip, take) =>
          ctx.prisma.tbl_contrato_mandante.findMany({
            where,
            skip,
            take,
            orderBy: { fechaInicio: 'desc' },
          }),
        count: () => ctx.prisma.tbl_contrato_mandante.count({ where }),
      }) as never;
    },
  }),
);

builder.mutationField('createContratoMandante', (t) =>
  t.prismaField({
    type: ContratoMandante,
    args: {
      input: t.arg({ type: CreateContratoMandanteInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const data = CreateContratoMandanteInputSchema.parse(args.input);
      await requerirAccesoMandante(ctx.usuario?.idusuario, data.idmandante);
      return ctx.prisma.tbl_contrato_mandante.create({
        ...(query as Record<string, unknown>),
        data: {
          idmandante: data.idmandante,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin ?? null,
          permitePagoAnticipado: data.permitePagoAnticipado,
          estado: data.estado,
        },
      }) as never;
    },
  }),
);

builder.mutationField('updateContratoMandante', (t) =>
  t.prismaField({
    type: ContratoMandante,
    args: {
      input: t.arg({ type: UpdateContratoMandanteInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const { idcontrato, ...updateData } =
        UpdateContratoMandanteInputSchema.parse(args.input);
      const existente = await ctx.prisma.tbl_contrato_mandante.findUnique({
        where: { idcontrato },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Contrato no encontrado.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        existente.idmandante,
      );
      return ctx.prisma.tbl_contrato_mandante.update({
        ...(query as Record<string, unknown>),
        where: { idcontrato },
        data: updateData,
      }) as never;
    },
  }),
);

builder.mutationField('deleteContratoMandante', (t) =>
  t.field({
    type: 'Boolean',
    args: { idcontrato: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const { idcontrato } = z
        .object({ idcontrato: IdPositiveSchema })
        .parse(args);
      const existente = await ctx.prisma.tbl_contrato_mandante.findUnique({
        where: { idcontrato },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Contrato no encontrado.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        existente.idmandante,
      );
      await ctx.prisma.tbl_contrato_mandante.update({
        where: { idcontrato },
        data: { deletedAt: new Date() },
      });
      return true;
    },
  }),
);
