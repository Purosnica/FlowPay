import { builder ,type  GraphQLContext } from "../../builder";

import { Acuerdo, CreateAcuerdoInput, CreateAcuerdoInputSchema } from "./types";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import { PERMISO } from "@/lib/permissions/permiso-codes";
import { requerirAccesoMandante } from "@/lib/cobranza/mandante-scope";
import { requerirAccesoPrestamoCobrador } from "@/lib/cobranza/cobrador-scope";
import { simularAcuerdo } from "@/lib/cobranza/acuerdo-simulator";
import { decimalToNumber } from "@/lib/cobranza/decimal-utils";
import {
  mapPoliticas,
  validarPorcentajeContraMandante,
  validarPorcentajeContraPolitica,
} from "@/lib/cobranza/politica-descuento-service";
import { registrarAuditoria } from "@/lib/cobranza/auditoria-service";
import { emitirNotificacionAcuerdo } from "@/lib/cobranza/notificacion-emision-service";
import { generarCuotasAcuerdo, evaluarCuotasAcuerdo } from "@/lib/cobranza/acuerdo-cuota-service";
import { marcarEstadoAcuerdoVigente, transicionarEstadoPrestamo } from "@/lib/cobranza/estado-prestamo-service";
import { sincronizarMoraPrestamo } from "@/lib/cobranza/dias-mora-service";
import {
  obtenerConfigNumerica,
  CLAVE_ACUERDO_DESCUENTO_MAX_SIN_APROBACION,
} from "@/lib/cobranza/configuracion-cobranza-service";
import { esSupervisor } from "@/lib/cobranza/equipo-scope";
import { GraphQLValidationError } from "@/lib/errors/graphql-errors";

builder.mutationField("createAcuerdo", (t) =>
  t.prismaField({
    type: Acuerdo,
    args: { input: t.arg({ type: CreateAcuerdoInput, required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.ACUERDO_WRITE);
      const input = CreateAcuerdoInputSchema.parse(args.input);

      const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
        where: { idprestamo: input.idprestamo },
        include: { mandante: true },
      });
      if (!prestamo || prestamo.deletedAt) {
        throw new GraphQLValidationError("Préstamo no encontrado.");
      }
      await requerirAccesoMandante(ctx.usuario?.idusuario, prestamo.idmandante);
      await requerirAccesoPrestamoCobrador(
        ctx.usuario?.idusuario,
        input.idprestamo,
      );

      const acuerdoVigente = await ctx.prisma.tbl_acuerdo.findFirst({
        where: {
          idprestamo: input.idprestamo,
          estado: 'VIGENTE',
          deletedAt: null,
        },
      });
      if (acuerdoVigente) {
        throw new GraphQLValidationError(
          'Ya existe un acuerdo vigente para este préstamo.',
        );
      }

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

      const maxSinAprobacion = await obtenerConfigNumerica(
        CLAVE_ACUERDO_DESCUENTO_MAX_SIN_APROBACION,
      );
      if (
        input.porcentajeDesc > maxSinAprobacion &&
        ctx.usuario?.idusuario &&
        !(await esSupervisor(ctx.usuario.idusuario))
      ) {
        throw new GraphQLValidationError(
          `Descuento superior al ${maxSinAprobacion}% requiere aprobación de supervisor.`,
        );
      }

      const sim = simularAcuerdo({
        saldoTotal: decimalToNumber(prestamo.saldoTotal),
        interesMoratorio: decimalToNumber(prestamo.interesMoratorio),
        gestionCobranza: decimalToNumber(prestamo.gestionCobranza),
        porcentajeDesc: input.porcentajeDesc,
        numeroCuotas: input.numeroCuotas,
        dispensarInteresMoratorio: input.dispensarInteresMoratorio,
        dispensarGestionCobranza: input.dispensarGestionCobranza,
      });

      const acuerdo = await ctx.prisma.$transaction(async (tx) => {
        const created = await tx.tbl_acuerdo.create({
          data: {
            idmandante: prestamo.idmandante,
            idprestamo: input.idprestamo,
            idgestion: input.idgestion,
            baseNegociable: sim.baseNegociable,
            porcentajeDesc: input.porcentajeDesc,
            montoDescuento: sim.montoDescuento,
            montoAcordado: sim.montoAcordado,
            numeroCuotas: input.numeroCuotas,
            montoCuota: sim.montoCuota,
            pagoMinimo: sim.pagoMinimo,
            dispensarInteresMoratorio: input.dispensarInteresMoratorio,
            dispensarGestionCobranza: input.dispensarGestionCobranza,
            fechaInicio: input.fechaInicio,
            estado: "VIGENTE",
          },
        });

        await tx.tbl_prestamo.update({
          where: { idprestamo: input.idprestamo },
          data: { reportableCentralRiesgo: false },
        });

        await generarCuotasAcuerdo(tx, {
          idacuerdo: created.idacuerdo,
          montoAcordado: sim.montoAcordado,
          numeroCuotas: input.numeroCuotas,
          fechaInicio: input.fechaInicio,
        });

        await marcarEstadoAcuerdoVigente(
          tx,
          input.idprestamo,
          ctx.usuario?.idusuario,
        );

        await sincronizarMoraPrestamo(
          tx,
          input.idprestamo,
          ctx.usuario?.idusuario,
        );

        await registrarAuditoria(tx, {
          idusuario: ctx.usuario?.idusuario,
          entidad: 'tbl_acuerdo',
          entidadId: created.idacuerdo,
          accion: 'CREATE',
          detalle: JSON.stringify({
            idprestamo: input.idprestamo,
            montoAcordado: sim.montoAcordado,
            porcentajeDesc: input.porcentajeDesc,
            dispensarInteresMoratorio: input.dispensarInteresMoratorio,
            dispensarGestionCobranza: input.dispensarGestionCobranza,
          }),
        });

        return created;
      });

      if (ctx.usuario?.idusuario) {
        await emitirNotificacionAcuerdo(
          acuerdo.idacuerdo,
          ctx.usuario.idusuario,
        );
      }

      return ctx.prisma.tbl_acuerdo.findUniqueOrThrow({
        ...(query as Record<string, unknown>),
        where: { idacuerdo: acuerdo.idacuerdo },
      }) as never;
    },
  }),
);

const ESTADOS_ACUERDO_MANUAL = ['VIGENTE', 'ROTO'] as const;

builder.mutationField("actualizarEstadoAcuerdo", (t) =>
  t.prismaField({
    type: Acuerdo,
    args: {
      idacuerdo: t.arg.int({ required: true }),
      estado: t.arg.string({ required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.ACUERDO_WRITE);
      const estado = args.estado.toUpperCase();
      if (estado === 'CUMPLIDO') {
        throw new GraphQLValidationError(
          'El estado CUMPLIDO solo se asigna automáticamente al aplicar pagos.',
        );
      }
      if (
        !ESTADOS_ACUERDO_MANUAL.includes(
          estado as (typeof ESTADOS_ACUERDO_MANUAL)[number],
        )
      ) {
        throw new GraphQLValidationError(
          `Estado inválido. Valores permitidos: ${ESTADOS_ACUERDO_MANUAL.join(', ')}`,
        );
      }
      const acuerdo = await ctx.prisma.tbl_acuerdo.findUnique({
        where: { idacuerdo: args.idacuerdo },
      });
      if (!acuerdo || acuerdo.deletedAt) {
        throw new GraphQLValidationError("Acuerdo no encontrado.");
      }
      await requerirAccesoMandante(ctx.usuario?.idusuario, acuerdo.idmandante);
      await requerirAccesoPrestamoCobrador(
        ctx.usuario?.idusuario,
        acuerdo.idprestamo,
      );

      const updated = await ctx.prisma.$transaction(async (tx) => {
        const result = await tx.tbl_acuerdo.update({
          where: { idacuerdo: args.idacuerdo },
          data: { estado },
        });

        if (estado === 'ROTO') {
          const otroVigente = await tx.tbl_acuerdo.findFirst({
            where: {
              idprestamo: acuerdo.idprestamo,
              estado: 'VIGENTE',
              deletedAt: null,
              idacuerdo: { not: args.idacuerdo },
            },
          });
          if (!otroVigente) {
            await tx.tbl_prestamo.update({
              where: { idprestamo: acuerdo.idprestamo },
              data: { reportableCentralRiesgo: true },
            });
          }
          await transicionarEstadoPrestamo(tx, {
            idprestamo: acuerdo.idprestamo,
            estadoNuevo: 'Vencido',
            idusuario: ctx.usuario?.idusuario,
            motivo: 'Acuerdo marcado como roto',
            forzar: true,
          });
        } else if (estado === 'VIGENTE') {
          await tx.tbl_prestamo.update({
            where: { idprestamo: acuerdo.idprestamo },
            data: { reportableCentralRiesgo: false },
          });
        }

        await registrarAuditoria(tx, {
          idusuario: ctx.usuario?.idusuario,
          entidad: 'tbl_acuerdo',
          entidadId: args.idacuerdo,
          accion: 'UPDATE_ESTADO',
          detalle: JSON.stringify({ estado }),
        });

        if (estado === 'VIGENTE') {
          await evaluarCuotasAcuerdo(tx, args.idacuerdo, ctx.usuario?.idusuario);
        }

        return result;
      });

      return ctx.prisma.tbl_acuerdo.findUniqueOrThrow({
        ...(query as Record<string, unknown>),
        where: { idacuerdo: updated.idacuerdo },
      }) as never;
    },
  }),
);
