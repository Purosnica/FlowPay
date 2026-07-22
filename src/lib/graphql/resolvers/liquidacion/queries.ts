import { builder ,type  GraphQLContext } from '../../builder';

import { Liquidacion, LiquidacionPage, SimulacionLiquidacionType, DetallePagoLiquidacionType } from './types';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { filtroMandante, requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { simularLiquidacion, obtenerDetalleLiquidacion } from '@/lib/contexts/liquidacion';

import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../helpers/graphql-helpers';

builder.queryField('liquidaciones', (t) =>
  t.field({
    type: LiquidacionPage,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: false }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.LIQUIDACION_READ);
      await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);

      const { page, pageSize, skip } = resolvePagination(
        args.page,
        args.pageSize,
      );
      const where = {
        idmandante: args.idmandante,
        deletedAt: null,
        ...(args.periodo ? { periodo: args.periodo } : {}),
      };

      const [liquidaciones, total] = await Promise.all([
        ctx.prisma.tbl_liquidacion.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: [{ periodo: 'desc' }, { createdAt: 'desc' }],
          include: { mandante: true },
        }),
        ctx.prisma.tbl_liquidacion.count({ where }),
      ]);

      return {
        liquidaciones,
        ...buildPaginationMeta(total, page, pageSize),
      };
    },
  }),
);

builder.queryField('liquidacion', (t) =>
  t.prismaField({
    type: Liquidacion,
    nullable: true,
    args: { id: t.arg.int({ required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.LIQUIDACION_READ);
      const mandanteFilter = await filtroMandante(ctx.usuario?.idusuario);
      return ctx.prisma.tbl_liquidacion.findFirst({
        ...(query as Record<string, unknown>),
        where: {
          idliquidacion: args.id,
          deletedAt: null,
          idmandante: mandanteFilter,
        },
      }) as never;
    },
  }),
);

builder.queryField('simularLiquidacion', (t) =>
  t.field({
    type: SimulacionLiquidacionType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.LIQUIDACION_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        return await simularLiquidacion(
          args.idmandante,
          args.periodo,
          idusuario,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al simular.';
        throw new GraphQLValidationError(msg);
      }
    },
  }),
);

builder.queryField('liquidacionDetalle', (t) =>
  t.field({
    type: [DetallePagoLiquidacionType],
    args: { idliquidacion: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.LIQUIDACION_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerDetalleLiquidacion(args.idliquidacion, idusuario);
    },
  }),
);
