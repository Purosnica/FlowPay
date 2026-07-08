import './types';
import { builder ,type  GraphQLContext } from '../../builder';

import { z } from 'zod';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  crearSecuenciaContacto,
  listarSecuenciasPorCampana,
  listarSecuenciasPorMandante,
  obtenerAgendaSecuenciaHoy,
} from '@/lib/cobranza/secuencia-contacto-service';
import {
  listarImportacionJobs,
  obtenerImportacionJob,
} from '@/lib/cobranza/import/importacion-job-service';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';

const PasoSecuenciaInput = builder.inputType('PasoSecuenciaInput', {
  fields: (t) => ({
    orden: t.int({ required: true }),
    diasDesdeInicio: t.int({ required: true }),
    canal: t.string({ required: true }),
    accion: t.string({ required: false }),
    idplantilla: t.int({ required: false }),
  }),
});

const CreateSecuenciaInput = builder.inputType('CreateSecuenciaContactoInput', {
  fields: (t) => ({
    idcampana: t.int({ required: true }),
    idmandante: t.int({ required: true }),
    nombre: t.string({ required: true }),
    pasos: t.field({ type: [PasoSecuenciaInput], required: true }),
  }),
});

const CreateSecuenciaSchema = z.object({
  idcampana: z.number().int().positive(),
  idmandante: z.number().int().positive(),
  nombre: z.string().min(1),
  pasos: z
    .array(
      z.object({
        orden: z.number().int().positive(),
        diasDesdeInicio: z.number().int().min(0),
        canal: z.string().min(1),
        accion: z.string().optional().nullable(),
        idplantilla: z.number().int().positive().optional().nullable(),
      }),
    )
    .min(1),
});

const SecuenciaPasoType = builder.objectRef<{
  idpaso: number;
  orden: number;
  diasDesdeInicio: number;
  canal: string;
  accion: string | null;
  idplantilla: number | null;
  plantillaNombre: string | null;
}>('SecuenciaContactoPaso').implement({
  fields: (t) => ({
    idpaso: t.exposeInt('idpaso'),
    orden: t.exposeInt('orden'),
    diasDesdeInicio: t.exposeInt('diasDesdeInicio'),
    canal: t.exposeString('canal'),
    accion: t.exposeString('accion', { nullable: true }),
    idplantilla: t.exposeInt('idplantilla', { nullable: true }),
    plantillaNombre: t.exposeString('plantillaNombre', { nullable: true }),
  }),
});

const SecuenciaType = builder.objectRef<{
  idsecuencia: number;
  idcampana: number;
  idmandante: number;
  nombre: string;
  estado: string;
  pasos: Array<{
    idpaso: number;
    orden: number;
    diasDesdeInicio: number;
    canal: string;
    accion: string | null;
    idplantilla: number | null;
    plantillaNombre: string | null;
  }>;
}>('SecuenciaContacto').implement({
  fields: (t) => ({
    idsecuencia: t.exposeInt('idsecuencia'),
    idcampana: t.exposeInt('idcampana'),
    idmandante: t.exposeInt('idmandante'),
    nombre: t.exposeString('nombre'),
    estado: t.exposeString('estado'),
    pasos: t.field({ type: [SecuenciaPasoType], resolve: (p) => p.pasos }),
  }),
});

const ImportJobType = builder.objectRef<{
  idjob: number;
  idmandante: number;
  idcampana: number | null;
  tipo: string;
  estado: string;
  nombreArchivo: string;
  progresoPct: number;
  filasProcesadas: number;
  filasTotales: number;
  resultado: string | null;
  error: string | null;
  createdAt: Date;
  iniciadoEn: Date | null;
  finalizadoEn: Date | null;
}>('ImportacionJob').implement({
  fields: (t) => ({
    idjob: t.exposeInt('idjob'),
    idmandante: t.exposeInt('idmandante'),
    idcampana: t.exposeInt('idcampana', { nullable: true }),
    tipo: t.exposeString('tipo'),
    estado: t.exposeString('estado'),
    nombreArchivo: t.exposeString('nombreArchivo'),
    progresoPct: t.exposeInt('progresoPct'),
    filasProcesadas: t.exposeInt('filasProcesadas'),
    filasTotales: t.exposeInt('filasTotales'),
    resultado: t.exposeString('resultado', { nullable: true }),
    error: t.exposeString('error', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    iniciadoEn: t.expose('iniciadoEn', { type: 'DateTime', nullable: true }),
    finalizadoEn: t.expose('finalizadoEn', { type: 'DateTime', nullable: true }),
  }),
});

const AgendaSecuenciaType = builder.objectRef<{
  idprestamo: number;
  noPrestamo: string;
  canal: string;
  accion: string | null;
  diasDesdeInicio: number;
  nombreCliente: string;
}>('AgendaSecuenciaItem').implement({
  fields: (t) => ({
    idprestamo: t.exposeInt('idprestamo'),
    noPrestamo: t.exposeString('noPrestamo'),
    canal: t.exposeString('canal'),
    accion: t.exposeString('accion', { nullable: true }),
    diasDesdeInicio: t.exposeInt('diasDesdeInicio'),
    nombreCliente: t.exposeString('nombreCliente'),
  }),
});

const SecuenciaMandanteType = builder.objectRef<{
  idsecuencia: number;
  idcampana: number;
  idmandante: number;
  nombre: string;
  estado: string;
  campanaNombre: string;
  pasos: Array<{
    idpaso: number;
    orden: number;
    diasDesdeInicio: number;
    canal: string;
    accion: string | null;
    idplantilla: number | null;
    plantillaNombre: string | null;
  }>;
}>('SecuenciaContactoMandante').implement({
  fields: (t) => ({
    idsecuencia: t.exposeInt('idsecuencia'),
    idcampana: t.exposeInt('idcampana'),
    idmandante: t.exposeInt('idmandante'),
    nombre: t.exposeString('nombre'),
    estado: t.exposeString('estado'),
    campanaNombre: t.exposeString('campanaNombre'),
    pasos: t.field({ type: [SecuenciaPasoType], resolve: (p) => p.pasos }),
  }),
});

builder.queryField('secuenciasPorCampana', (t) =>
  t.field({
    type: [SecuenciaType],
    args: { idcampana: t.arg.int({ required: true }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return listarSecuenciasPorCampana(idusuario, args.idcampana);
    },
  }),
);

builder.queryField('secuenciasPorMandante', (t) =>
  t.field({
    type: [SecuenciaMandanteType],
    args: { idmandante: t.arg.int({ required: true }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.MANDANTE_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return listarSecuenciasPorMandante(idusuario, args.idmandante);
    },
  }),
);

builder.queryField('agendaSecuenciaHoy', (t) =>
  t.field({
    type: [AgendaSecuenciaType],
    args: { idcampana: t.arg.int({ required: false }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerAgendaSecuenciaHoy(idusuario, args.idcampana ?? undefined);
    },
  }),
);

builder.queryField('importacionJobs', (t) =>
  t.field({
    type: [ImportJobType],
    args: { limite: t.arg.int({ required: false, defaultValue: 20 }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return listarImportacionJobs(idusuario, args.limite ?? 20);
    },
  }),
);

builder.queryField('importacionJob', (t) =>
  t.field({
    type: ImportJobType,
    nullable: true,
    args: { idjob: t.arg.int({ required: true }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        return null;
      }
      return obtenerImportacionJob(args.idjob, idusuario);
    },
  }),
);

builder.mutationField('createSecuenciaContacto', (t) =>
  t.field({
    type: SecuenciaType,
    args: { input: t.arg({ type: CreateSecuenciaInput, required: true }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      const data = CreateSecuenciaSchema.parse(args.input);
      return crearSecuenciaContacto(idusuario, data);
    },
  }),
);
