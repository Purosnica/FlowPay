import { builder, type GraphQLContext } from '../../builder';

import { z } from 'zod';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  simularAsignacionCartera,
  ejecutarAsignacionCartera,
  listarHistorialAsignacion,
  cancelarPrestamo,
  toggleBloqueoAsignacion,
} from '@/lib/contexts/cartera';
import { requerirAccesoPrestamoCobrador } from '@/lib/cobranza/cobrador-scope';
import { IdPositiveSchema } from '@/lib/validators/graphql-args';
import { asGraphQLValidationError } from '@/lib/errors/client-safe-message';

function wrapServiceError(err: unknown): never {
  throw asGraphQLValidationError(err, 'Operación de asignación fallida.');
}

const MetodosAsignacion = [
  'POR_MORA',
  'ALEATORIO',
  'POR_CANTIDAD',
  'POR_MONTO',
] as const;

const MetodoAsignacionSchema = z.enum(MetodosAsignacion, {
  message: 'Método de asignación inválido.',
});

const FiltrosAsignacionSchema = z.object({
  idmandante: IdPositiveSchema,
  idgestorAsignado: IdPositiveSchema.optional(),
  estado: z.string().optional(),
  tramoMoraMin: z.number().int().min(0).optional(),
  tramoMoraMax: z.number().int().min(0).nullable().optional(),
  idprestamos: z.array(IdPositiveSchema).optional(),
  sinAsignar: z.boolean().optional(),
});

const SimularAsignacionArgsSchema = z.object({
  filtros: FiltrosAsignacionSchema,
  idgestores: z
    .array(IdPositiveSchema)
    .min(1, 'Debe indicar al menos un gestor'),
  metodo: MetodoAsignacionSchema,
});

const EjecutarAsignacionArgsSchema = SimularAsignacionArgsSchema.extend({
  motivo: z
    .string()
    .trim()
    .max(500, 'El motivo no puede exceder 500 caracteres')
    .nullish()
    .transform((v) => v ?? undefined),
});

const CancelarPrestamoSchema = z.object({
  idprestamo: IdPositiveSchema,
  motivo: z
    .string()
    .trim()
    .max(500, 'El motivo no puede exceder 500 caracteres')
    .nullish()
    .transform((v) => v ?? undefined),
});

const ToggleBloqueoAsignacionSchema = z.object({
  idprestamo: IdPositiveSchema,
  bloqueado: z.boolean({
    message: 'bloqueado debe ser booleano',
  }),
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
      const parsed = SimularAsignacionArgsSchema.parse(args);
      try {
        return await simularAsignacionCartera(
          ctx.usuario?.idusuario ?? 0,
          parsed.filtros,
          parsed.idgestores,
          parsed.metodo,
        );
      } catch (err) {
        wrapServiceError(err);
      }
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
      const parsed = EjecutarAsignacionArgsSchema.parse(args);
      try {
        const result = await ejecutarAsignacionCartera(
          ctx.usuario?.idusuario ?? 0,
          parsed.filtros,
          parsed.idgestores,
          parsed.metodo,
          parsed.motivo,
        );
        return result.asignados;
      } catch (err) {
        wrapServiceError(err);
      }
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
      const { idprestamo, motivo } = CancelarPrestamoSchema.parse(args);
      try {
        await cancelarPrestamo(
          idprestamo,
          ctx.usuario?.idusuario ?? 0,
          motivo,
        );
        return true;
      } catch (err) {
        wrapServiceError(err);
      }
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
      const { idprestamo, bloqueado } =
        ToggleBloqueoAsignacionSchema.parse(args);
      try {
        await toggleBloqueoAsignacion(
          idprestamo,
          ctx.usuario?.idusuario ?? 0,
          bloqueado,
        );
        return true;
      } catch (err) {
        wrapServiceError(err);
      }
    },
  }),
);
