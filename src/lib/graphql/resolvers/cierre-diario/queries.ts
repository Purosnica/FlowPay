import { builder, type GraphQLContext } from '../../builder';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { listarCierresDiarios } from '@/lib/cobranza/cierre-diario-service';
import { CierreDiarioType } from './types';

builder.queryField('cierresDiarios', (t) => t.field({
  type: [CierreDiarioType],
  args: {
    idmandante: t.arg.int({ required: false }),
    estado: t.arg.string({ required: false }),
    take: t.arg.int({ required: false, defaultValue: 50 }),
  },
  resolve: async (_parent, args, ctx: GraphQLContext) => {
    await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CIERRE_VIEW);
    const idusuario = ctx.usuario?.idusuario;
    if (!idusuario) throw new GraphQLValidationError('Usuario no autenticado.');
    return listarCierresDiarios(idusuario, {
      idmandante: args.idmandante ?? undefined,
      estado: args.estado ?? undefined,
      take: args.take ?? 50,
    });
  },
}));
