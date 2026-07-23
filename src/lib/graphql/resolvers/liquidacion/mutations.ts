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
} from '@/lib/contexts/liquidacion';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { mensajeClienteSeguro } from '@/lib/errors/client-safe-message';
import { z } from 'zod';

function wrapServiceError(err: unknown): never {
  if (err instanceof GraphQLValidationError) {
    throw err;
  }
  throw new GraphQLValidationError(
    mensajeClienteSeguro(err, 'Operación fallida.'),
  );
}

const GenerarLiquidacionSchema = z.object({
  idmandante: z.number().int().positive(),
  periodo: z.string().regex(/^\d{4}-\d{2}$/, 'Periodo debe ser YYYY-MM'),
  idempotencyKey: z.preprocess(
    (v) => (v === null || v === '' ? undefined : v),
    z
      .string()
      .trim()
      .min(8)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/, 'idempotencyKey inválida')
      .optional(),
  ),
});

const IdLiquidacionSchema = z.object({
  idliquidacion: z.number().int().positive(),
});

builder.mutationField('generarLiquidacion', (t) =>
  t.field({
    type: GenerarLiquidacionResultType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
      idempotencyKey: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.LIQUIDACION_WRITE);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      const parsed = GenerarLiquidacionSchema.parse(args);
      try {
        return await generarLiquidacion({
          idmandante: parsed.idmandante,
          periodo: parsed.periodo,
          idusuario,
          idempotencyKey: parsed.idempotencyKey,
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
      const { idliquidacion } = IdLiquidacionSchema.parse(args);
      try {
        await emitirLiquidacion(idliquidacion, idusuario);
      } catch (err) {
        throw wrapServiceError(err);
      }
      return ctx.prisma.tbl_liquidacion.findUniqueOrThrow({
        ...(query as Record<string, unknown>),
        where: { idliquidacion },
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
      const { idliquidacion } = IdLiquidacionSchema.parse(args);
      try {
        await marcarLiquidacionPagada(idliquidacion, idusuario);
      } catch (err) {
        throw wrapServiceError(err);
      }
      return ctx.prisma.tbl_liquidacion.findUniqueOrThrow({
        ...(query as Record<string, unknown>),
        where: { idliquidacion },
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
      const { idliquidacion } = IdLiquidacionSchema.parse(args);
      try {
        await revertirLiquidacionPagada(idliquidacion, idusuario);
      } catch (err) {
        throw wrapServiceError(err);
      }
      return ctx.prisma.tbl_liquidacion.findUniqueOrThrow({
        ...(query as Record<string, unknown>),
        where: { idliquidacion },
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
      const { idliquidacion } = IdLiquidacionSchema.parse(args);
      try {
        await anularLiquidacionBorrador(idliquidacion, idusuario);
      } catch (err) {
        throw wrapServiceError(err);
      }
      return true;
    },
  }),
);
