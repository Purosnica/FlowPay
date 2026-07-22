import { builder, type GraphQLContext } from '../../builder';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  actualizarConfigOperativaMandante,
  obtenerConfigOperativaMandante,
  restablecerConfigOperativaMandanteGlobal,
} from '@/lib/cobranza/config-operativa-mandante-service';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { IdPositiveSchema } from '@/lib/validators/graphql-args';
import { z } from 'zod';

const ActualizarConfigOperativaMandanteSchema = z.object({
  idmandante: IdPositiveSchema,
  pagoAutoAplicar: z.boolean().nullish(),
  acuerdoDiasGracia: z.number().int().min(0).max(30).nullish(),
  diasMoraCastigo: z.number().int().min(0).max(999).nullish(),
  moraDiasGracia: z.number().int().min(0).max(30).nullish(),
});

const ConfigOperativaMandanteType = builder
  .objectRef<Awaited<ReturnType<typeof obtenerConfigOperativaMandante>>>(
    'ConfigOperativaMandante',
  )
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      pagoAutoAplicar: t.exposeBoolean('pagoAutoAplicar'),
      acuerdoDiasGracia: t.exposeInt('acuerdoDiasGracia'),
      diasMoraCastigo: t.exposeInt('diasMoraCastigo'),
      moraDiasGracia: t.exposeInt('moraDiasGracia'),
      usaGlobalPagoAutoAplicar: t.exposeBoolean('usaGlobalPagoAutoAplicar'),
      usaGlobalAcuerdoDiasGracia: t.exposeBoolean(
        'usaGlobalAcuerdoDiasGracia',
      ),
      usaGlobalDiasMoraCastigo: t.exposeBoolean('usaGlobalDiasMoraCastigo'),
      usaGlobalMoraDiasGracia: t.exposeBoolean('usaGlobalMoraDiasGracia'),
    }),
  });

builder.queryField('configOperativaMandante', (t) =>
  t.field({
    type: ConfigOperativaMandanteType,
    args: { idmandante: t.arg.int({ required: true }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerConfigOperativaMandante(idusuario, args.idmandante);
    },
  }),
);

builder.mutationField('actualizarConfigOperativaMandante', (t) =>
  t.field({
    type: ConfigOperativaMandanteType,
    args: {
      idmandante: t.arg.int({ required: true }),
      pagoAutoAplicar: t.arg.boolean({ required: false }),
      acuerdoDiasGracia: t.arg.int({ required: false }),
      diasMoraCastigo: t.arg.int({ required: false }),
      moraDiasGracia: t.arg.int({ required: false }),
    },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      const parsed = ActualizarConfigOperativaMandanteSchema.parse(args);
      return actualizarConfigOperativaMandante(idusuario, parsed.idmandante, {
        pagoAutoAplicar: parsed.pagoAutoAplicar ?? undefined,
        acuerdoDiasGracia: parsed.acuerdoDiasGracia ?? undefined,
        diasMoraCastigo: parsed.diasMoraCastigo ?? undefined,
        moraDiasGracia: parsed.moraDiasGracia ?? undefined,
      });
    },
  }),
);

builder.mutationField('restablecerConfigOperativaMandanteGlobal', (t) =>
  t.field({
    type: ConfigOperativaMandanteType,
    args: { idmandante: t.arg.int({ required: true }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      const { idmandante } = z
        .object({ idmandante: IdPositiveSchema })
        .parse(args);
      return restablecerConfigOperativaMandanteGlobal(idusuario, idmandante);
    },
  }),
);
