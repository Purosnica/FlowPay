import { builder ,type  GraphQLContext } from '../../builder';

import {
  ComisionCobro,
  CreateComisionCobroInput,
  UpdateComisionCobroInput,
  CreateComisionCobroInputSchema,
  UpdateComisionCobroInputSchema,
} from './types';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';

builder.mutationField('createComisionCobro', (t) =>
  t.prismaField({
    type: ComisionCobro,
    args: {
      input: t.arg({ type: CreateComisionCobroInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const data = CreateComisionCobroInputSchema.parse(args.input);
      await requerirAccesoMandante(ctx.usuario?.idusuario, data.idmandante);

      if (
        data.tramoMoraMax !== null &&
        data.tramoMoraMax !== undefined &&
        data.tramoMoraMax < data.tramoMoraMin
      ) {
        throw new GraphQLValidationError(
          'El máximo de mora debe ser mayor o igual al mínimo.',
        );
      }

      return ctx.prisma.tbl_comision_cobro.create({
        ...(query as Record<string, unknown>),
        data: {
          idmandante: data.idmandante,
          tramoMoraMin: data.tramoMoraMin,
          tramoMoraMax: data.tramoMoraMax ?? null,
          porcentaje: data.porcentaje,
          estado: data.estado,
        },
      }) as never;
    },
  }),
);

builder.mutationField('updateComisionCobro', (t) =>
  t.prismaField({
    type: ComisionCobro,
    args: {
      input: t.arg({ type: UpdateComisionCobroInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const { idcomision, ...updateData } =
        UpdateComisionCobroInputSchema.parse(args.input);

      const existente = await ctx.prisma.tbl_comision_cobro.findUnique({
        where: { idcomision },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Tramo de comisión no encontrado.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        existente.idmandante,
      );

      const tramoMin = updateData.tramoMoraMin ?? existente.tramoMoraMin;
      const tramoMax =
        updateData.tramoMoraMax !== undefined
          ? updateData.tramoMoraMax
          : existente.tramoMoraMax;
      if (tramoMax !== null && tramoMax < tramoMin) {
        throw new GraphQLValidationError(
          'El máximo de mora debe ser mayor o igual al mínimo.',
        );
      }

      return ctx.prisma.tbl_comision_cobro.update({
        ...(query as Record<string, unknown>),
        where: { idcomision },
        data: updateData,
      }) as never;
    },
  }),
);

builder.mutationField('deleteComisionCobro', (t) =>
  t.field({
    type: 'Boolean',
    args: { idcomision: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const existente = await ctx.prisma.tbl_comision_cobro.findUnique({
        where: { idcomision: args.idcomision },
      });
      if (!existente || existente.deletedAt) {
        throw new GraphQLValidationError('Tramo de comisión no encontrado.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        existente.idmandante,
      );
      await ctx.prisma.tbl_comision_cobro.update({
        where: { idcomision: args.idcomision },
        data: { deletedAt: new Date(), estado: false },
      });
      return true;
    },
  }),
);
