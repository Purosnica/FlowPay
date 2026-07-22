import { builder ,type  GraphQLContext } from '../../builder';

import { MandanteTipificacion } from '../contrato-mandante/types';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { registrarAuditoria } from '@/lib/cobranza/auditoria-service';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { CodigoAccion, CodigoResultado } from '../tipificacion/types';
import { z } from 'zod';

const AddTipificacionMandanteSchema = z
  .object({
    idmandante: z.number().int().positive(),
    idcodaccion: z.number().int().positive().nullable().optional(),
    idcodresultado: z.number().int().positive().nullable().optional(),
  })
  .refine((d) => d.idcodaccion != null || d.idcodresultado != null, {
    message: 'Debe indicar código de acción o resultado.',
  });

const RemoveTipificacionMandanteSchema = z.object({
  idmt: z.number().int().positive(),
});

builder.queryField('tipificacionesMandante', (t) =>
  t.field({
    type: [MandanteTipificacion],
    args: { idmandante: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_READ);
      await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);
      return ctx.prisma.tbl_mandante_tipificacion.findMany({
        where: { idmandante: args.idmandante, activo: true },
        include: { codaccion: true, codresult: true },
        orderBy: { idmt: 'asc' },
      }) as never;
    },
  }),
);

async function idsTipificacionMandante(
  ctx: GraphQLContext,
  idmandante: number,
  tipo: 'accion' | 'resultado',
): Promise<number[] | null> {
  const rows = await ctx.prisma.tbl_mandante_tipificacion.findMany({
    where: {
      idmandante,
      activo: true,
      ...(tipo === 'accion'
        ? { idcodaccion: { not: null } }
        : { idcodresultado: { not: null } }),
    },
  });
  if (rows.length === 0) {
    return null;
  }
  return rows
    .map((r) => (tipo === 'accion' ? r.idcodaccion : r.idcodresultado))
    .filter((id): id is number => id !== null);
}

builder.queryField('codigosAccionPorMandante', (t) =>
  t.field({
    type: [CodigoAccion],
    args: { idmandante: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_READ);
      await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);
      const ids = await idsTipificacionMandante(ctx, args.idmandante, 'accion');
      return ctx.prisma.tbl_codigo_accion.findMany({
        where: {
          estado: true,
          deletedAt: null,
          ...(ids ? { idcodaccion: { in: ids } } : {}),
        },
        orderBy: { codigo: 'asc' },
      }) as never;
    },
  }),
);

builder.queryField('codigosResultadoPorMandante', (t) =>
  t.field({
    type: [CodigoResultado],
    args: { idmandante: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_READ);
      await requerirAccesoMandante(ctx.usuario?.idusuario, args.idmandante);
      const ids = await idsTipificacionMandante(
        ctx,
        args.idmandante,
        'resultado',
      );
      return ctx.prisma.tbl_codigo_resultado.findMany({
        where: {
          estado: true,
          deletedAt: null,
          ...(ids ? { idcodresultado: { in: ids } } : {}),
        },
        orderBy: { codigo: 'asc' },
      }) as never;
    },
  }),
);

builder.mutationField('addTipificacionMandante', (t) =>
  t.prismaField({
    type: MandanteTipificacion,
    args: {
      idmandante: t.arg.int({ required: true }),
      idcodaccion: t.arg.int({ required: false }),
      idcodresultado: t.arg.int({ required: false }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const data = AddTipificacionMandanteSchema.parse(args);
      await requerirAccesoMandante(ctx.usuario?.idusuario, data.idmandante);
      const created = await ctx.prisma.tbl_mandante_tipificacion.create({
        ...(query as Record<string, unknown>),
        data: {
          idmandante: data.idmandante,
          idcodaccion: data.idcodaccion ?? null,
          idcodresultado: data.idcodresultado ?? null,
          activo: true,
        },
      });
      await registrarAuditoria(ctx.prisma, {
        idusuario: ctx.usuario?.idusuario,
        entidad: 'tbl_mandante_tipificacion',
        entidadId: created.idmt,
        accion: 'CREATE',
        detalle: JSON.stringify({
          idmandante: data.idmandante,
          idcodaccion: data.idcodaccion ?? null,
          idcodresultado: data.idcodresultado ?? null,
        }),
      });
      return created as never;
    },
  }),
);

builder.mutationField('removeTipificacionMandante', (t) =>
  t.field({
    type: 'Boolean',
    args: { idmt: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const { idmt } = RemoveTipificacionMandanteSchema.parse(args);
      const row = await ctx.prisma.tbl_mandante_tipificacion.findUnique({
        where: { idmt },
      });
      if (!row) {
        throw new GraphQLValidationError('Tipificación no encontrada.');
      }
      await requerirAccesoMandante(ctx.usuario?.idusuario, row.idmandante);
      await ctx.prisma.tbl_mandante_tipificacion.update({
        where: { idmt },
        data: { activo: false },
      });
      await registrarAuditoria(ctx.prisma, {
        idusuario: ctx.usuario?.idusuario,
        entidad: 'tbl_mandante_tipificacion',
        entidadId: idmt,
        accion: 'SOFT_DELETE',
        detalle: JSON.stringify({ idmandante: row.idmandante }),
      });
      return true;
    },
  }),
);
