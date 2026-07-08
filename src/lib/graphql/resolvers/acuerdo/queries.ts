import { builder ,type  GraphQLContext } from "../../builder";

import {
  Acuerdo,
  SimulacionAcuerdoResult,
  SimularAcuerdoInput,
  SimularAcuerdoInputSchema,
} from "./types";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import { PERMISO } from "@/lib/permissions/permiso-codes";
import { filtroMandante, requerirAccesoMandante } from "@/lib/cobranza/mandante-scope";
import { simularAcuerdo } from "@/lib/cobranza/acuerdo-simulator";
import { decimalToNumber } from "@/lib/cobranza/decimal-utils";
import {
  mapPoliticas,
  validarPorcentajeContraMandante,
  validarPorcentajeContraPolitica,
} from "@/lib/cobranza/politica-descuento-service";
import { GraphQLValidationError } from "@/lib/errors/graphql-errors";

builder.queryField("simularAcuerdo", (t) =>
  t.field({
    type: SimulacionAcuerdoResult,
    args: { input: t.arg({ type: SimularAcuerdoInput, required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.ACUERDO_READ);
      const input = SimularAcuerdoInputSchema.parse(args.input);
      const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
        where: { idprestamo: input.idprestamo },
        include: { mandante: true },
      });
      if (!prestamo || prestamo.deletedAt) {
        throw new GraphQLValidationError("Préstamo no encontrado.");
      }
      await requerirAccesoMandante(ctx.usuario?.idusuario, prestamo.idmandante);

      try {
        validarPorcentajeContraMandante(
          input.porcentajeDesc,
          decimalToNumber(prestamo.mandante.descuentoMaximo),
          prestamo.mandante.nombre,
        );
      } catch (err) {
        throw new GraphQLValidationError(
          err instanceof Error
            ? err.message
            : 'Descuento excede el máximo autorizado del mandante.',
        );
      }

      const politicasRows = await ctx.prisma.tbl_politica_descuento.findMany({
        where: {
          idmandante: prestamo.idmandante,
          deletedAt: null,
          estado: true,
        },
      });
      try {
        validarPorcentajeContraPolitica(
          input.porcentajeDesc,
          prestamo.diasMora,
          mapPoliticas(politicasRows),
        );
      } catch (err) {
        throw new GraphQLValidationError(
          err instanceof Error ? err.message : 'Política de descuento inválida.',
        );
      }

      return simularAcuerdo({
        saldoTotal: decimalToNumber(prestamo.saldoTotal),
        interesMoratorio: decimalToNumber(prestamo.interesMoratorio),
        porcentajeDesc: input.porcentajeDesc,
        numeroCuotas: input.numeroCuotas,
      });
    },
  }),
);

builder.queryField("acuerdos", (t) =>
  t.field({
    type: [Acuerdo],
    args: {
      idprestamo: t.arg.int({ required: true }),
      estado: t.arg.string({ required: false }),
      limit: t.arg.int({ required: false, defaultValue: 50 }),
    },
    resolve: async (_parent, args, ctx) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.ACUERDO_READ);
      const mandanteFilter = await filtroMandante(ctx.usuario?.idusuario);
      const take = Math.min(Math.max(args.limit ?? 50, 1), 100);

      const prestamo = await ctx.prisma.tbl_prestamo.findFirst({
        where: {
          idprestamo: args.idprestamo,
          deletedAt: null,
          idmandante: mandanteFilter,
        },
        select: { idprestamo: true },
      });
      if (!prestamo) {
        throw new GraphQLValidationError('Préstamo no encontrado o sin acceso.');
      }

      return ctx.prisma.tbl_acuerdo.findMany({
        where: {
          deletedAt: null,
          idprestamo: args.idprestamo,
          idmandante: mandanteFilter,
          ...(args.estado ? { estado: args.estado } : {}),
        },
        orderBy: { createdAt: "desc" },
        take,
        include: {
          prestamo: true,
          cuotas: { orderBy: { numeroCuota: 'asc' } },
        },
      });
    },
  }),
);
