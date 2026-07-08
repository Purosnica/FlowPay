import { builder ,type  GraphQLContext } from '../../builder';

import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import {
  listarEjecucionesCron,
  obtenerMonitorCron,
} from '@/lib/cron/cron-query-service';
import { ejecutarCronOperacionesCobranza } from '@/lib/cron/cron-orchestrator';

const CronJobMonitorType = builder
  .objectRef<Awaited<ReturnType<typeof obtenerMonitorCron>>['jobs'][number]>(
    'CronJobMonitor',
  )
  .implement({
    fields: (t) => ({
      idjob: t.exposeInt('idjob'),
      codigo: t.exposeString('codigo'),
      nombre: t.exposeString('nombre'),
      descripcion: t.exposeString('descripcion', { nullable: true }),
      schedule: t.exposeString('schedule', { nullable: true }),
      activo: t.exposeBoolean('activo'),
      timeoutMs: t.exposeInt('timeoutMs'),
      maxReintentos: t.exposeInt('maxReintentos'),
      orden: t.exposeInt('orden'),
      ultimaEjecucion: t.expose('ultimaEjecucion', {
        type: 'DateTime',
        nullable: true,
      }),
      proximaEjecucion: t.expose('proximaEjecucion', {
        type: 'DateTime',
        nullable: true,
      }),
      ultimoEstado: t.exposeString('ultimoEstado', { nullable: true }),
    }),
  });

const CronEjecucionMonitorType = builder
  .objectRef<
    Awaited<ReturnType<typeof obtenerMonitorCron>>['ejecucionesRecientes'][number]
  >('CronEjecucionMonitor')
  .implement({
    fields: (t) => ({
      idejecucion: t.exposeInt('idejecucion'),
      idjob: t.exposeInt('idjob'),
      codigoJob: t.exposeString('codigoJob'),
      nombreJob: t.exposeString('nombreJob'),
      idEjecucionPadre: t.exposeInt('idEjecucionPadre', { nullable: true }),
      estado: t.exposeString('estado'),
      intento: t.exposeInt('intento'),
      trigger: t.exposeString('trigger'),
      iniciadoEn: t.expose('iniciadoEn', { type: 'DateTime' }),
      finalizadoEn: t.expose('finalizadoEn', {
        type: 'DateTime',
        nullable: true,
      }),
      duracionMs: t.exposeInt('duracionMs', { nullable: true }),
      registrosProcesados: t.exposeInt('registrosProcesados'),
      resultado: t.exposeString('resultado', { nullable: true }),
      error: t.exposeString('error', { nullable: true }),
    }),
  });

const CronEstadisticasType = builder
  .objectRef<
    Awaited<ReturnType<typeof obtenerMonitorCron>>['estadisticas']
  >('CronEstadisticas')
  .implement({
    fields: (t) => ({
      totalJobs: t.exposeInt('totalJobs'),
      jobsActivos: t.exposeInt('jobsActivos'),
      ejecucionesOk24h: t.exposeInt('ejecucionesOk24h'),
      ejecucionesError24h: t.exposeInt('ejecucionesError24h'),
      ultimaEjecucionGlobal: t.expose('ultimaEjecucionGlobal', {
        type: 'DateTime',
        nullable: true,
      }),
    }),
  });

const CronMonitorResumenType = builder
  .objectRef<Awaited<ReturnType<typeof obtenerMonitorCron>>>(
    'CronMonitorResumen',
  )
  .implement({
    fields: (t) => ({
      jobs: t.field({ type: [CronJobMonitorType], resolve: (p) => p.jobs }),
      ejecucionesRecientes: t.field({
        type: [CronEjecucionMonitorType],
        resolve: (p) => p.ejecucionesRecientes,
      }),
      estadisticas: t.field({
        type: CronEstadisticasType,
        resolve: (p) => p.estadisticas,
      }),
    }),
  });

const CronEjecucionesPageType = builder
  .objectRef<Awaited<ReturnType<typeof listarEjecucionesCron>>>(
    'CronEjecucionesPage',
  )
  .implement({
    fields: (t) => ({
      filas: t.field({
        type: [CronEjecucionMonitorType],
        resolve: (p) => p.filas,
      }),
      total: t.exposeInt('total'),
      page: t.exposeInt('page'),
      pageSize: t.exposeInt('pageSize'),
      totalPages: t.exposeInt('totalPages'),
    }),
  });

const CronEjecucionManualType = builder
  .objectRef<Awaited<ReturnType<typeof ejecutarCronOperacionesCobranza>>>(
    'CronEjecucionManual',
  )
  .implement({
    fields: (t) => ({
      idejecucion: t.exposeInt('idejecucion'),
      estado: t.exposeString('estado'),
      iniciadoEn: t.exposeString('iniciadoEn'),
      finalizadoEn: t.exposeString('finalizadoEn'),
      duracionMs: t.exposeInt('duracionMs'),
      errores: t.exposeInt('errores'),
      omitidos: t.exposeInt('omitidos'),
    }),
  });

builder.queryField('cronMonitor', (t) =>
  t.field({
    type: CronMonitorResumenType,
    resolve: async (_p, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONFIG_SYSTEM);
      return obtenerMonitorCron();
    },
  }),
);

builder.queryField('cronEjecuciones', (t) =>
  t.field({
    type: CronEjecucionesPageType,
    args: {
      codigoJob: t.arg.string({ required: false }),
      estado: t.arg.string({ required: false }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONFIG_SYSTEM);
      return listarEjecucionesCron({
        codigoJob: args.codigoJob ?? undefined,
        estado: args.estado ?? undefined,
        page: args.page ?? 1,
        pageSize: args.pageSize ?? 20,
      });
    },
  }),
);

builder.mutationField('ejecutarCronOperaciones', (t) =>
  t.field({
    type: CronEjecucionManualType,
    resolve: async (_p, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONFIG_SYSTEM);
      if (!ctx.usuario?.idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return ejecutarCronOperacionesCobranza('manual');
    },
  }),
);
