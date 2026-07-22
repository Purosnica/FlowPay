import { builder ,type  GraphQLContext } from "../../builder";

import { Gestion, CreateGestionInput, CreateGestionInputSchema } from "./types";
import { requerirPermiso } from "@/lib/permissions/permission-service";
import { PERMISO } from "@/lib/permissions/permiso-codes";
import { requerirAccesoMandante } from "@/lib/cobranza/mandante-scope";
import { requerirAccesoPrestamoCobrador } from "@/lib/cobranza/cobrador-scope";
import { validarHorarioCobranza } from "@/lib/cobranza/horario-cobranza-service";
import { validarContactoParaGestion } from "@/lib/cobranza/contacto-compliance-service";
import { registrarAuditoria } from "@/lib/cobranza/auditoria-service";
import { emitirNotificacionGestion } from "@/lib/cobranza/notificacion-emision-service";
import { transicionarEstadoPrestamo } from "@/lib/cobranza/estado-prestamo-service";
import { GraphQLValidationError } from "@/lib/errors/graphql-errors";
import { Prisma } from "@prisma/client";
import {
  FEATURE_FLAG,
  isFeatureEnabled,
} from "@/lib/feature-flags/feature-flag-service";
import { ESTADO_PROMESA } from "@/lib/logic/promesa-estado-logic";

builder.mutationField("createGestion", (t) =>
  t.prismaField({
    type: Gestion,
    args: { input: t.arg({ type: CreateGestionInput, required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_WRITE);
      if (!ctx.usuario) throw new GraphQLValidationError("Debes estar autenticado.");

      const data = CreateGestionInputSchema.parse(args.input);
      const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
        where: { idprestamo: data.idprestamo },
        include: { cliente: { select: { idcliente: true } } },
      });
      if (!prestamo || prestamo.deletedAt) {
        throw new GraphQLValidationError("Préstamo no encontrado.");
      }
      await requerirAccesoMandante(ctx.usuario.idusuario, prestamo.idmandante);
      await requerirAccesoPrestamoCobrador(
        ctx.usuario.idusuario,
        data.idprestamo,
      );

      if (data.idempotencyKey) {
        const offlineOk = await isFeatureEnabled(
          FEATURE_FLAG.PWA_OFFLINE_GESTIONES,
          prestamo.idmandante,
          true,
        );
        if (!offlineOk) {
          throw new GraphQLValidationError(
            "Gestiones offline deshabilitadas para este mandante.",
          );
        }
        const existente = await ctx.prisma.tbl_gestion.findFirst({
          where: {
            idgestor: ctx.usuario.idusuario,
            idempotencyKey: data.idempotencyKey,
            deletedAt: null,
          },
        });
        if (existente) {
          return ctx.prisma.tbl_gestion.findUniqueOrThrow({
            ...(query as Record<string, unknown>),
            where: { idgestion: existente.idgestion },
          }) as never;
        }
      }

      // Replay offline (H20): horario se validó al capturar; no revalidar al sync.
      if (!data.idempotencyKey) {
        const horario = await validarHorarioCobranza(
          new Date(),
          prestamo.idmandante,
        );
        if (!horario.permitido) {
          throw new GraphQLValidationError(
            horario.motivo ?? 'Gestión fuera de horario permitido.',
          );
        }
      }

      const contacto = await validarContactoParaGestion({
        idcliente: prestamo.idcliente,
        telefonoContacto: data.telefonoContacto,
        contactoTercero: data.contactoTercero,
      });
      if (!contacto.permitido) {
        throw new GraphQLValidationError(
          contacto.motivo ?? 'Contacto no permitido.',
        );
      }

      if (data.contactoTercero) {
        const codAccion = data.idcodaccion
          ? await ctx.prisma.tbl_codigo_accion.findUnique({ where: { idcodaccion: data.idcodaccion } })
          : null;
        if (codAccion?.esTercero && !data.comentario) {
          throw new GraphQLValidationError(
            "Contacto a tercero requiere justificación en el comentario (Ley 787).",
          );
        }
      }

      let gestion;
      try {
        gestion = await ctx.prisma.$transaction(async (tx) => {
          const created = await tx.tbl_gestion.create({
            data: {
              idmandante: prestamo.idmandante,
              idprestamo: data.idprestamo,
              idgestor: ctx.usuario!.idusuario,
              idcodaccion: data.idcodaccion,
              idcodresultado: data.idcodresultado,
              telefonoContacto: data.telefonoContacto,
              contactoTercero: data.contactoTercero,
              nota: data.nota,
              razonMora: data.razonMora,
              montoPromesa: data.montoPromesa,
              fechaPromesa: data.fechaPromesa,
              estadoPromesa:
                data.montoPromesa && data.fechaPromesa
                  ? ESTADO_PROMESA.PENDIENTE
                  : null,
              fechaProximaGestion: data.fechaProximaGestion,
              comentario: data.comentario,
              latitud: data.latitud,
              longitud: data.longitud,
              idempotencyKey: data.idempotencyKey,
            },
          });

          await registrarAuditoria(tx, {
            idusuario: ctx.usuario!.idusuario,
            entidad: 'tbl_gestion',
            entidadId: created.idgestion,
            accion: 'CREATE',
            detalle: JSON.stringify({
              idprestamo: data.idprestamo,
              montoPromesa: data.montoPromesa,
              fechaPromesa: data.fechaPromesa,
            }),
          });

          if (data.montoPromesa && data.fechaPromesa) {
            const estadosNegociacion = ['Vigente', 'Vencido'];
            if (estadosNegociacion.includes(prestamo.estado)) {
              await transicionarEstadoPrestamo(tx, {
                idprestamo: data.idprestamo,
                estadoNuevo: 'En negociación',
                idusuario: ctx.usuario!.idusuario,
                motivo: 'Promesa de pago registrada',
              });
            }
          }

          return created;
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          data.idempotencyKey
        ) {
          const dup = await ctx.prisma.tbl_gestion.findFirst({
            where: {
              idgestor: ctx.usuario.idusuario,
              idempotencyKey: data.idempotencyKey,
              deletedAt: null,
            },
          });
          if (dup) {
            return ctx.prisma.tbl_gestion.findUniqueOrThrow({
              ...(query as Record<string, unknown>),
              where: { idgestion: dup.idgestion },
            }) as never;
          }
        }
        throw err;
      }

      await emitirNotificacionGestion(gestion.idgestion);

      return ctx.prisma.tbl_gestion.findUniqueOrThrow({
        ...(query as Record<string, unknown>),
        where: { idgestion: gestion.idgestion },
      }) as never;
    },
  }),
);
