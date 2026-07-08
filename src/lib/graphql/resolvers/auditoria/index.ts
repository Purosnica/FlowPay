import { builder ,type  GraphQLContext } from '../../builder';

import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  listarAuditoria,
  obtenerResumenAuditoria,
} from '@/lib/cobranza/auditoria-query-service';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';

const AuditoriaFilaType = builder.objectRef<{
  idauditoria: number;
  entidad: string;
  entidadId: number | null;
  accion: string;
  detalle: string | null;
  usuario: string | null;
  createdAt: Date;
}>('AuditoriaFila').implement({
  fields: (t) => ({
    idauditoria: t.exposeInt('idauditoria'),
    entidad: t.exposeString('entidad'),
    entidadId: t.exposeInt('entidadId', { nullable: true }),
    accion: t.exposeString('accion'),
    detalle: t.exposeString('detalle', { nullable: true }),
    usuario: t.exposeString('usuario', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

const AuditoriaPageType = builder.objectRef<
  Awaited<ReturnType<typeof listarAuditoria>>
>('AuditoriaPage').implement({
  fields: (t) => ({
    filas: t.field({ type: [AuditoriaFilaType], resolve: (p) => p.filas }),
    total: t.exposeInt('total'),
    page: t.exposeInt('page'),
    pageSize: t.exposeInt('pageSize'),
    totalPages: t.exposeInt('totalPages'),
  }),
});

const AuditoriaResumenType = builder
  .objectRef<Awaited<ReturnType<typeof obtenerResumenAuditoria>>>(
    'AuditoriaResumen',
  )
  .implement({
    fields: (t) => ({
      total24h: t.exposeInt('total24h'),
      total7d: t.exposeInt('total7d'),
      topEntidades: t.field({
        type: [
          builder
            .objectRef<{ entidad: string; cantidad: number }>(
              'AuditoriaTopEntidad',
            )
            .implement({
              fields: (t2) => ({
                entidad: t2.exposeString('entidad'),
                cantidad: t2.exposeInt('cantidad'),
              }),
            }),
        ],
        resolve: (p) => p.topEntidades,
      }),
    }),
  });

builder.queryField('auditoria', (t) =>
  t.field({
    type: AuditoriaPageType,
    args: {
      entidad: t.arg.string({ required: false }),
      accion: t.arg.string({ required: false }),
      entidadId: t.arg.int({ required: false }),
      fechaDesde: t.arg.string({ required: false }),
      fechaHasta: t.arg.string({ required: false }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONFIG_SYSTEM);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return listarAuditoria(idusuario, {
        entidad: args.entidad ?? undefined,
        accion: args.accion ?? undefined,
        entidadId: args.entidadId ?? undefined,
        fechaDesde: args.fechaDesde ?? undefined,
        fechaHasta: args.fechaHasta ?? undefined,
        page: args.page ?? 1,
        pageSize: args.pageSize ?? 20,
      });
    },
  }),
);

builder.queryField('auditoriaResumen', (t) =>
  t.field({
    type: AuditoriaResumenType,
    resolve: async (_p, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONFIG_SYSTEM);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerResumenAuditoria(idusuario);
    },
  }),
);
