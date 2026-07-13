import { builder ,type  GraphQLContext } from '../../builder';

import {
  GenerarLiquidacionResultType,
  Liquidacion,
} from './types';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  anularLiquidacionBorrador,
  emitirLiquidacion,
  generarLiquidacion,
  marcarLiquidacionPagada,
  revertirLiquidacionPagada,
} from '@/lib/cobranza/liquidacion-service';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';

function wrapServiceError(err: unknown): never {
  const msg = err instanceof Error ? err.message : 'Operación fallida.';
  throw new GraphQLValidationError(msg);
}

builder.mutationField('generarLiquidacion', (t) =>
  t.field({
    type: GenerarLiquidacionResultType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.LIQUIDACION_WRITE);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        return await generarLiquidacion({
          idmandante: args.idmandante,
          periodo: args.periodo,
          idusuario,
        });
      } catch (err) {
        throw wrapServiceError(err);
      }
    },
  }),
);

builder.mutationField('emitirLiquidacion', (t) =>
  t.prismaField({
    type: Liquidacion,
    args: { idliquidacion: t.arg.int({ required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.LIQUIDACION_WRITE);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        await emitirLiquidacion(args.idliquidacion, idusuario);
      } catch (err) {
        throw wrapServiceError(err);
      }
      return ctx.prisma.tbl_liquidacion.findUniqueOrThrow({
        ...(query as Record<string, unknown>),
        where: { idliquidacion: args.idliquidacion },
      }) as never;
    },
  }),
);

builder.mutationField('marcarLiquidacionPagada', (t) =>
  t.prismaField({
    type: Liquidacion,
    args: { idliquidacion: t.arg.int({ required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.LIQUIDACION_WRITE);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        await marcarLiquidacionPagada(args.idliquidacion, idusuario);
      } catch (err) {
        throw wrapServiceError(err);
      }
      return ctx.prisma.tbl_liquidacion.findUniqueOrThrow({
        ...(query as Record<string, unknown>),
        where: { idliquidacion: args.idliquidacion },
      }) as never;
    },
  }),
);

builder.mutationField('revertirLiquidacionPagada', (t) =>
  t.prismaField({
    type: Liquidacion,
    args: { idliquidacion: t.arg.int({ required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.LIQUIDACION_WRITE);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        await revertirLiquidacionPagada(args.idliquidacion, idusuario);
      } catch (err) {
        throw wrapServiceError(err);
      }
      return ctx.prisma.tbl_liquidacion.findUniqueOrThrow({
        ...(query as Record<string, unknown>),
        where: { idliquidacion: args.idliquidacion },
      }) as never;
    },
  }),
);

builder.mutationField('anularLiquidacion', (t) =>
  t.field({
    type: 'Boolean',
    args: { idliquidacion: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.LIQUIDACION_WRITE);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        await anularLiquidacionBorrador(args.idliquidacion, idusuario);
      } catch (err) {
        throw wrapServiceError(err);
      }
      return true;
    },
  }),
);
