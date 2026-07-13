import { builder ,type  GraphQLContext } from '../../builder';

import { z } from 'zod';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  simularAsignacionCartera,
  ejecutarAsignacionCartera,
  listarHistorialAsignacion,
  cancelarPrestamo,
  toggleBloqueoAsignacion,
  type MetodoAsignacion,
} from '@/lib/cobranza/asignacion-cartera-service';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { requerirAccesoPrestamoCobrador } from '@/lib/cobranza/cobrador-scope';

const MetodosAsignacion = [
  'POR_MORA',
  'ALEATORIO',
  'POR_CANTIDAD',
  'POR_MONTO',
] as const;

const FiltrosAsignacionSchema = z.object({
  idmandante: z.number().int().positive(),
  idgestorAsignado: z.number().int().positive().optional(),
  estado: z.string().optional(),
  tramoMoraMin: z.number().int().min(0).optional(),
  tramoMoraMax: z.number().int().min(0).nullable().optional(),
  idprestamos: z.array(z.number().int().positive()).optional(),
  sinAsignar: z.boolean().optional(),
});

export const FiltrosAsignacionInput = builder.inputRef('FiltrosAsignacionInput').implement({
  fields: (t) => ({
    idmandante: t.int({ required: true }),
    idgestorAsignado: t.int({ required: false }),
    estado: t.string({ required: false }),
    tramoMoraMin: t.int({ required: false }),
    tramoMoraMax: t.int({ required: false }),
    idprestamos: t.intList({ required: false }),
    sinAsignar: t.boolean({ required: false }),
  }),
});

type SimulacionGestorItem = {
  idgestor: number;
  nombre: string;
  cantidadPrestamos: number;
  saldoTotal: number;
  cantidadClientes: number;
};

export const SimulacionGestor = builder.objectRef<SimulacionGestorItem>('SimulacionGestor').implement({
  fields: (t) => ({
    idgestor: t.exposeInt('idgestor'),
    nombre: t.exposeString('nombre'),
    cantidadPrestamos: t.exposeInt('cantidadPrestamos'),
    saldoTotal: t.exposeFloat('saldoTotal'),
    cantidadClientes: t.exposeInt('cantidadClientes'),
  }),
});

export const SimulacionAsignacion = builder.objectRef<{
  metodo: string;
  totalPrestamos: number;
  totalSaldo: number;
  gestores: SimulacionGestorItem[];
}>('SimulacionAsignacion').implement({
  fields: (t) => ({
    metodo: t.exposeString('metodo'),
    totalPrestamos: t.exposeInt('totalPrestamos'),
    totalSaldo: t.exposeFloat('totalSaldo'),
    gestores: t.field({
      type: [SimulacionGestor],
      resolve: (p) => p.gestores,
    }),
  }),
});

export const HistorialAsignacion = builder.objectRef<{
  idhistorial: number;
  gestorAnterior: string | null;
  gestorNuevo: string;
  usuario: string;
  motivo: string | null;
  createdAt: Date;
}>('HistorialAsignacion').implement({
  fields: (t) => ({
    idhistorial: t.exposeInt('idhistorial'),
    gestorAnterior: t.exposeString('gestorAnterior', { nullable: true }),
    gestorNuevo: t.exposeString('gestorNuevo'),
    usuario: t.exposeString('usuario'),
    motivo: t.exposeString('motivo', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

builder.queryField('simularAsignacionCartera', (t) =>
  t.field({
    type: SimulacionAsignacion,
    args: {
      filtros: t.arg({ type: FiltrosAsignacionInput, required: true }),
      idgestores: t.arg.intList({ required: true }),
      metodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const filtros = FiltrosAsignacionSchema.parse(args.filtros);
      const metodo = args.metodo as MetodoAsignacion;
      if (!MetodosAsignacion.includes(metodo)) {
        throw new GraphQLValidationError('Método de asignación inválido.');
      }
      return simularAsignacionCartera(
        ctx.usuario?.idusuario ?? 0,
        filtros,
        args.idgestores,
        metodo,
      );
    },
  }),
);

builder.queryField('historialAsignacionPrestamo', (t) =>
  t.field({
    type: [HistorialAsignacion],
    args: {
      idprestamo: t.arg.int({ required: true }),
      limit: t.arg.int({ required: false, defaultValue: 50 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      await requerirAccesoPrestamoCobrador(
        ctx.usuario?.idusuario,
        args.idprestamo,
      );
      const take = Math.min(Math.max(args.limit ?? 50, 1), 100);
      return listarHistorialAsignacion(
        ctx.usuario?.idusuario ?? 0,
        args.idprestamo,
        take,
      );
    },
  }),
);

builder.mutationField('ejecutarAsignacionCartera', (t) =>
  t.field({
    type: 'Int',
    args: {
      filtros: t.arg({ type: FiltrosAsignacionInput, required: true }),
      idgestores: t.arg.intList({ required: true }),
      metodo: t.arg.string({ required: true }),
      motivo: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const filtros = FiltrosAsignacionSchema.parse(args.filtros);
      const metodo = args.metodo as MetodoAsignacion;
      const result = await ejecutarAsignacionCartera(
        ctx.usuario?.idusuario ?? 0,
        filtros,
        args.idgestores,
        metodo,
        args.motivo,
      );
      return result.asignados;
    },
  }),
);

builder.mutationField('cancelarPrestamo', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      idprestamo: t.arg.int({ required: true }),
      motivo: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      await cancelarPrestamo(
        args.idprestamo,
        ctx.usuario?.idusuario ?? 0,
        args.motivo,
      );
      return true;
    },
  }),
);

builder.mutationField('toggleBloqueoAsignacion', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      idprestamo: t.arg.int({ required: true }),
      bloqueado: t.arg.boolean({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      await toggleBloqueoAsignacion(
        args.idprestamo,
        ctx.usuario?.idusuario ?? 0,
        args.bloqueado,
      );
      return true;
    },
  }),
);
