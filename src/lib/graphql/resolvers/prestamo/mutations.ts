import { builder ,type  GraphQLContext } from "../../builder";

import { Prestamo, CreatePrestamoInput, CreatePrestamoInputSchema , TransicionEstadoInput } from "./types";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import { PERMISO } from "@/lib/permissions/permiso-codes";
import { requerirAccesoMandante } from "@/lib/cobranza/mandante-scope";
import { GraphQLValidationError } from "@/lib/errors/graphql-errors";
import {
  asignarGestorConHistorial,
  asignarGestorPorReferencias,
  asignarPrestamosAGestorEnLotes,
} from "@/lib/cobranza/asignacion-cartera-service";
import {
  ESTADOS_PRESTAMO,
  transicionarEstadoPrestamo,
} from "@/lib/cobranza/estado-prestamo-service";
import { registrarPrestamoManual } from "@/lib/cobranza/registrar-prestamo-service";
import { parseReferenciasPrestamo } from "@/lib/cobranza/parse-referencias-prestamo";
import { IdPositiveSchema } from "@/lib/validators/graphql-args";
import { z } from "zod";

const MotivoOpcionalSchema = z
  .string()
  .trim()
  .max(500, "El motivo no puede exceder 500 caracteres")
  .nullish()
  .transform((v) => v ?? undefined);

const TransicionEstadoInputSchema = z.object({
  idprestamo: IdPositiveSchema,
  estadoNuevo: z.string().min(1, "El estado nuevo es obligatorio"),
  motivo: MotivoOpcionalSchema,
});

const AsignarGestorPrestamoSchema = z.object({
  idprestamo: IdPositiveSchema,
  idgestor: IdPositiveSchema,
  motivo: MotivoOpcionalSchema,
});

const AsignarGestorMasivoSchema = z.object({
  idprestamos: z
    .array(IdPositiveSchema)
    .min(1, "Debe indicar al menos un préstamo"),
  idgestor: IdPositiveSchema,
  motivo: MotivoOpcionalSchema,
});

const AsignarGestorPorReferenciasSchema = z.object({
  idmandante: IdPositiveSchema,
  referenciasTexto: z
    .string()
    .trim()
    .min(1, "Pegue al menos un No. préstamo o código único."),
  idgestor: IdPositiveSchema,
  motivo: MotivoOpcionalSchema,
});

builder.mutationField("createPrestamo", (t) =>
  t.prismaField({
    type: Prestamo,
    args: { input: t.arg({ type: CreatePrestamoInput, required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const data = CreatePrestamoInputSchema.parse(args.input);
      await requerirAccesoMandante(ctx.usuario?.idusuario, data.idmandante);
      const idprestamo = await ctx.prisma.$transaction(async (tx) => {
        return registrarPrestamoManual(tx, {
          input: data,
          idusuario: ctx.usuario?.idusuario,
        });
      });
      return ctx.prisma.tbl_prestamo.findUniqueOrThrow({
        ...(query as Record<string, unknown>),
        where: { idprestamo },
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
      const { idprestamo, idgestor, motivo } =
        AsignarGestorPrestamoSchema.parse(args);
      const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
        where: { idprestamo },
      });
      if (!prestamo || prestamo.deletedAt) {
        throw new GraphQLValidationError("Préstamo no encontrado.");
      }
      await requerirAccesoMandante(ctx.usuario.idusuario, prestamo.idmandante);
      await asignarGestorConHistorial(
        idprestamo,
        idgestor,
        ctx.usuario.idusuario,
        motivo,
      );
      return ctx.prisma.tbl_prestamo.findUnique({
        ...(query as Record<string, unknown>),
        where: { idprestamo },
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
      const parsed = AsignarGestorMasivoSchema.parse(args);
      const idusuario = ctx.usuario.idusuario;
      const idprestamosValidos: number[] = [];

      for (let i = 0; i < parsed.idprestamos.length; i += 100) {
        const batch = parsed.idprestamos.slice(i, i + 100);
        const prestamos = await ctx.prisma.tbl_prestamo.findMany({
          where: {
            idprestamo: { in: batch },
            deletedAt: null,
          },
          select: { idprestamo: true, idmandante: true },
        });
        for (const prestamo of prestamos) {
          await requerirAccesoMandante(idusuario, prestamo.idmandante);
          idprestamosValidos.push(prestamo.idprestamo);
        }
      }

      return asignarPrestamosAGestorEnLotes(
        idusuario,
        idprestamosValidos,
        parsed.idgestor,
        parsed.motivo,
      );
    },
  }),
);

const AsignacionPorReferenciasResult = builder
  .objectRef<{
    asignados: number;
    encontrados: number;
    omitidosYaAsignados: number;
    noEncontrados: string[];
  }>('AsignacionPorReferenciasResult')
  .implement({
    fields: (t) => ({
      asignados: t.exposeInt('asignados'),
      encontrados: t.exposeInt('encontrados'),
      omitidosYaAsignados: t.exposeInt('omitidosYaAsignados'),
      noEncontrados: t.exposeStringList('noEncontrados'),
    }),
  });

builder.mutationField('asignarGestorPorReferencias', (t) =>
  t.field({
    type: AsignacionPorReferenciasResult,
    args: {
      idmandante: t.arg.int({ required: true }),
      referenciasTexto: t.arg.string({ required: true }),
      idgestor: t.arg.int({ required: true }),
      motivo: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      if (!ctx.usuario) {
        throw new GraphQLValidationError('Debes estar autenticado.');
      }
      const parsed = AsignarGestorPorReferenciasSchema.parse(args);
      const referencias = parseReferenciasPrestamo(parsed.referenciasTexto);
      if (referencias.length === 0) {
        throw new GraphQLValidationError(
          'Pegue al menos un No. préstamo o código único.',
        );
      }
      try {
        return await asignarGestorPorReferencias(
          ctx.usuario.idusuario,
          parsed.idmandante,
          referencias,
          parsed.idgestor,
          parsed.motivo,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error al asignar préstamos.';
        throw new GraphQLValidationError(message);
      }
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
