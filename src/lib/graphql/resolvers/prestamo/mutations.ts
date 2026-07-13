import { builder ,type  GraphQLContext } from "../../builder";

import { Prestamo, CreatePrestamoInput, CreatePrestamoInputSchema , TransicionEstadoInput } from "./types";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import { PERMISO } from "@/lib/permissions/permiso-codes";
import { requerirAccesoMandante } from "@/lib/cobranza/mandante-scope";
import { GraphQLValidationError } from "@/lib/errors/graphql-errors";
import { asignarGestorConHistorial } from "@/lib/cobranza/asignacion-cartera-service";
import { emitirNotificacionAsignacion } from "@/lib/cobranza/notificacion-emision-service";
import {
  ESTADOS_PRESTAMO,
  transicionarEstadoPrestamo,
} from "@/lib/cobranza/estado-prestamo-service";
import { z } from "zod";


const TransicionEstadoInputSchema = z.object({
  idprestamo: z.number().int().positive(),
  estadoNuevo: z.string().min(1),
  motivo: z.string().optional(),
});

builder.mutationField("createPrestamo", (t) =>
  t.prismaField({
    type: Prestamo,
    args: { input: t.arg({ type: CreatePrestamoInput, required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const data = CreatePrestamoInputSchema.parse(args.input);
      await requerirAccesoMandante(ctx.usuario?.idusuario, data.idmandante);
      return ctx.prisma.tbl_prestamo.create({
        ...(query as Record<string, unknown>),
        data,
      }) as never;
    },
  }),
);

builder.mutationField("asignarGestorPrestamo", (t) =>
  t.prismaField({
    type: Prestamo,
    args: {
      idprestamo: t.arg.int({ required: true }),
      idgestor: t.arg.int({ required: true }),
      motivo: t.arg.string({ required: false }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      if (!ctx.usuario) {
        throw new GraphQLValidationError('Debes estar autenticado.');
      }
      const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
        where: { idprestamo: args.idprestamo },
      });
      if (!prestamo || prestamo.deletedAt) {
        throw new GraphQLValidationError("Préstamo no encontrado.");
      }
      await requerirAccesoMandante(ctx.usuario.idusuario, prestamo.idmandante);
      await asignarGestorConHistorial(
        args.idprestamo,
        args.idgestor,
        ctx.usuario.idusuario,
        args.motivo,
      );
      return ctx.prisma.tbl_prestamo.findUnique({
        ...(query as Record<string, unknown>),
        where: { idprestamo: args.idprestamo },
      }) as never;
    },
  }),
);

builder.mutationField('asignarGestorMasivo', (t) =>
  t.field({
    type: 'Int',
    args: {
      idprestamos: t.arg.intList({ required: true }),
      idgestor: t.arg.int({ required: true }),
      motivo: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      if (!ctx.usuario) {
        throw new GraphQLValidationError('Debes estar autenticado.');
      }
      const idusuario = ctx.usuario.idusuario;
      const asignados: number[] = [];
      for (const idprestamo of args.idprestamos) {
        const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
          where: { idprestamo },
        });
        if (!prestamo || prestamo.deletedAt) {
          continue;
        }
        await requerirAccesoMandante(idusuario, prestamo.idmandante);
        await asignarGestorConHistorial(
          idprestamo,
          args.idgestor,
          idusuario,
          args.motivo,
          { omitirNotificacion: true },
        );
        asignados.push(idprestamo);
      }
      if (asignados.length > 0) {
        await emitirNotificacionAsignacion(
          args.idgestor,
          idusuario,
          asignados,
        );
      }
      return asignados.length;
    },
  }),
);

builder.mutationField('transicionarEstadoPrestamo', (t) =>
  t.prismaField({
    type: Prestamo,
    args: {
      input: t.arg({ type: TransicionEstadoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const data = TransicionEstadoInputSchema.parse(args.input);
      if (
        !ESTADOS_PRESTAMO.includes(
          data.estadoNuevo as (typeof ESTADOS_PRESTAMO)[number],
        )
      ) {
        throw new GraphQLValidationError(
          `Estado inválido. Valores: ${ESTADOS_PRESTAMO.join(', ')}`,
        );
      }
      const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
        where: { idprestamo: data.idprestamo },
      });
      if (!prestamo || prestamo.deletedAt) {
        throw new GraphQLValidationError('Préstamo no encontrado.');
      }
      await requerirAccesoMandante(ctx.usuario?.idusuario, prestamo.idmandante);
      try {
        await ctx.prisma.$transaction(async (tx) => {
          await transicionarEstadoPrestamo(tx, {
            idprestamo: data.idprestamo,
            estadoNuevo: data.estadoNuevo,
            idusuario: ctx.usuario?.idusuario,
            motivo: data.motivo,
          });
        });
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          error.message.startsWith('Transición no permitida')
        ) {
          throw new GraphQLValidationError(error.message);
        }
        throw error;
      }
      return ctx.prisma.tbl_prestamo.findUniqueOrThrow({
        ...(query as Record<string, unknown>),
        where: { idprestamo: data.idprestamo },
      }) as never;
    },
  }),
);
