import { builder ,type  GraphQLContext } from '../../builder';

import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  actualizarMetasMandante,
  obtenerMetasMandante,
  restablecerMetasMandanteGlobal,
} from '@/lib/cobranza/metas-mandante-service';
import {
  actualizarMetasCobrador,
  obtenerMetasCobrador,
} from '@/lib/cobranza/metas-cobrador-service';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import {
  ActualizarMetasCobradorSchema,
  ActualizarMetasMandanteSchema,
  IdPositiveSchema,
} from '@/lib/validators/graphql-args';
import { z } from 'zod';

const MetasMandanteType = builder
  .objectRef<Awaited<ReturnType<typeof obtenerMetasMandante>>>('MetasMandante')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      metaGestionesSemana: t.exposeInt('metaGestionesSemana'),
      metaRecuperacionSemana: t.exposeFloat('metaRecuperacionSemana'),
      metaRecuperacionMes: t.exposeFloat('metaRecuperacionMes'),
      usaGlobalGestionesSemana: t.exposeBoolean('usaGlobalGestionesSemana'),
      usaGlobalRecuperacionSemana: t.exposeBoolean('usaGlobalRecuperacionSemana'),
      usaGlobalRecuperacionMes: t.exposeBoolean('usaGlobalRecuperacionMes'),
    }),
  });

const MetasCobradorType = builder
  .objectRef<Awaited<ReturnType<typeof obtenerMetasCobrador>>>('MetasCobrador')
  .implement({
    fields: (t) => ({
      idgestor: t.exposeInt('idgestor'),
      nombre: t.exposeString('nombre'),
      metaGestionesSemana: t.exposeInt('metaGestionesSemana'),
      metaRecuperacionSemana: t.exposeFloat('metaRecuperacionSemana'),
      usaGlobalGestionesSemana: t.exposeBoolean('usaGlobalGestionesSemana'),
      usaGlobalRecuperacionSemana: t.exposeBoolean('usaGlobalRecuperacionSemana'),
    }),
  });

builder.queryField('metasMandante', (t) =>
  t.field({
    type: MetasMandanteType,
    args: { idmandante: t.arg.int({ required: true }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerMetasMandante(idusuario, args.idmandante);
    },
  }),
);

builder.queryField('metasCobrador', (t) =>
  t.field({
    type: MetasCobradorType,
    args: { idgestor: t.arg.int({ required: true }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.EQUIPO_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerMetasCobrador(idusuario, args.idgestor);
    },
  }),
);

builder.mutationField('actualizarMetasMandante', (t) =>
  t.field({
    type: MetasMandanteType,
    args: {
      idmandante: t.arg.int({ required: true }),
      metaGestionesSemana: t.arg.int({ required: false }),
      metaRecuperacionSemana: t.arg.float({ required: false }),
      metaRecuperacionMes: t.arg.float({ required: false }),
    },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_WRITE);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      const parsed = ActualizarMetasMandanteSchema.parse(args);
      return actualizarMetasMandante(idusuario, parsed.idmandante, {
        metaGestionesSemana: parsed.metaGestionesSemana ?? undefined,
        metaRecuperacionSemana: parsed.metaRecuperacionSemana ?? undefined,
        metaRecuperacionMes: parsed.metaRecuperacionMes ?? undefined,
      });
    },
  }),
);

builder.mutationField('restablecerMetasMandanteGlobal', (t) =>
  t.field({
    type: MetasMandanteType,
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
      return restablecerMetasMandanteGlobal(idusuario, idmandante);
    },
  }),
);

builder.mutationField('actualizarMetasCobrador', (t) =>
  t.field({
    type: MetasCobradorType,
    args: {
      idgestor: t.arg.int({ required: true }),
      metaGestionesSemana: t.arg.int({ required: false }),
      metaRecuperacionSemana: t.arg.float({ required: false }),
    },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.EQUIPO_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      const parsed = ActualizarMetasCobradorSchema.parse(args);
      return actualizarMetasCobrador(idusuario, parsed.idgestor, {
        metaGestionesSemana: parsed.metaGestionesSemana ?? undefined,
        metaRecuperacionSemana: parsed.metaRecuperacionSemana ?? undefined,
      });
    },
  }),
);
