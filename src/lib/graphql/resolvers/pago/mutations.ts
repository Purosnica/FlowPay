import { builder, type GraphQLContext } from '../../builder';

import { Pago, CreatePagoInput, CreatePagoInputSchema } from './types';
import { requerirPermiso, tienePermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { requerirAccesoPrestamoCobrador } from '@/lib/cobranza/cobrador-scope';
import { registrarAuditoria } from '@/lib/cobranza/auditoria-service';
import { emitirNotificacionPago } from '@/lib/cobranza/notificacion-emision-service';
import {
  marcarPagoComoAplicadoAtomico,
  marcarPagoComoNoAplicadoAtomico,
} from '@/lib/cobranza/pago-aplicacion-service';
import {
  aplicarPagoAlPrestamo,
  revertirPagoDelPrestamo,
} from '@/lib/contexts/liquidacion';
import {
  obtenerConfigBooleanaMandante,
  CLAVE_PAGO_AUTO_APLICAR,
} from '@/lib/cobranza/configuracion-cobranza-service';
import { decimalToNumber } from '@/lib/cobranza/decimal-utils';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { validarPagoAnticipado } from '@/lib/cobranza/pago-validacion-service';
import {
  folioComprobantePago,
  rutaComprobantePago,
} from '@/lib/logic/comprobante-pago-logic';
import { encolarWebhookMandante } from '@/lib/cobranza/webhook-mandante-service';
import { MarcarPagoAplicadoSchema } from '@/lib/validators/graphql-args';

builder.mutationField('createPago', (t) =>
  t.prismaField({
    type: Pago,
    args: { input: t.arg({ type: CreatePagoInput, required: true }) },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.PAGO_WRITE);
      const data = CreatePagoInputSchema.parse(args.input);

      const prestamo = await ctx.prisma.tbl_prestamo.findUnique({
        where: { idprestamo: data.idprestamo },
      });
      if (!prestamo || prestamo.deletedAt) {
        throw new GraphQLValidationError('Préstamo no encontrado.');
      }
      await requerirAccesoMandante(
        ctx.usuario?.idusuario,
        prestamo.idmandante,
      );
      await requerirAccesoPrestamoCobrador(
        ctx.usuario?.idusuario,
        data.idprestamo,
      );

      if (!ctx.usuario?.idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }

      const existente = await ctx.prisma.tbl_pago.findFirst({
        where: {
          idgestor: ctx.usuario.idusuario,
          idempotencyKey: data.idempotencyKey,
          deletedAt: null,
        },
      });
      if (existente) {
        return ctx.prisma.tbl_pago.findUniqueOrThrow({
          ...(query as Record<string, unknown>),
          where: { idpago: existente.idpago },
        }) as never;
      }

      if (data.idacuerdo != null) {
        const acuerdo = await ctx.prisma.tbl_acuerdo.findFirst({
          where: {
            idacuerdo: data.idacuerdo,
            idprestamo: data.idprestamo,
            deletedAt: null,
          },
          select: { idacuerdo: true, estado: true },
        });
        if (!acuerdo) {
          throw new GraphQLValidationError(
            'El acuerdo no pertenece al préstamo indicado.',
          );
        }
      }

      const pago = await ctx.prisma.$transaction(async (tx) => {
        await validarPagoAnticipado(tx, {
          idprestamo: data.idprestamo,
          monto: data.monto,
          fechaPago: data.fechaPago,
        });

        let createdRaw;
        try {
          createdRaw = await tx.tbl_pago.create({
            data: {
              idmandante: prestamo.idmandante,
              idprestamo: data.idprestamo,
              idacuerdo: data.idacuerdo,
              idgestion: data.idgestion,
              idgestor: ctx.usuario?.idusuario,
              fechaPago: data.fechaPago,
              monto: data.monto,
              moneda: data.moneda,
              tipoCambio: data.tipoCambio,
              medio: data.medio,
              idempotencyKey: data.idempotencyKey,
            },
          });
        } catch (err) {
          const code =
            err && typeof err === 'object' && 'code' in err
              ? (err as { code?: string }).code
              : undefined;
          if (
            code === 'P2002' &&
            data.idempotencyKey &&
            ctx.usuario?.idusuario
          ) {
            const dup = await tx.tbl_pago.findFirst({
              where: {
                idgestor: ctx.usuario.idusuario,
                idempotencyKey: data.idempotencyKey,
                deletedAt: null,
              },
            });
            if (dup) {
              return dup;
            }
          }
          throw err;
        }

        const created = await tx.tbl_pago.update({
          where: { idpago: createdRaw.idpago },
          data: {
            reciboUrl: rutaComprobantePago(createdRaw.idpago),
            folio: folioComprobantePago(createdRaw.idpago),
          },
        });

        const autoAplicarConfig = await obtenerConfigBooleanaMandante(
          CLAVE_PAGO_AUTO_APLICAR,
          prestamo.idmandante,
        );
        const puedeAplicar = await tienePermiso(
          ctx.usuario?.idusuario,
          PERMISO.PAGO_APPLY,
        );
        const autoAplicar = autoAplicarConfig && puedeAplicar;
        if (autoAplicar) {
          const monto = decimalToNumber(created.monto);
          let idacuerdo = created.idacuerdo;
          if (!idacuerdo) {
            const acuerdoVigente = await tx.tbl_acuerdo.findFirst({
              where: {
                idprestamo: created.idprestamo,
                estado: 'VIGENTE',
                deletedAt: null,
              },
            });
            if (acuerdoVigente) {
              idacuerdo = acuerdoVigente.idacuerdo;
            }
          }

          const marcado = await marcarPagoComoAplicadoAtomico(
            tx,
            created.idpago,
            { idacuerdo },
          );
          if (marcado) {
            await aplicarPagoAlPrestamo(tx, {
              idprestamo: created.idprestamo,
              monto,
              fechaPago: created.fechaPago,
              idacuerdo,
              idpago: created.idpago,
              idusuario: ctx.usuario?.idusuario,
            });
          }
        }

        await registrarAuditoria(tx, {
          idusuario: ctx.usuario?.idusuario,
          entidad: 'tbl_pago',
          entidadId: created.idpago,
          accion: autoAplicar ? 'CREATE_AUTO_APLICADO' : 'CREATE',
          detalle: JSON.stringify({
            idprestamo: data.idprestamo,
            monto: data.monto,
            moneda: data.moneda,
            autoAplicar,
          }),
        });

        return tx.tbl_pago.findUniqueOrThrow({
          where: { idpago: created.idpago },
        });
      });

      await emitirNotificacionPago(pago.idpago);

      encolarWebhookMandante({
        idmandante: prestamo.idmandante,
        event: 'pago.creado',
        data: {
          idpago: pago.idpago,
          idprestamo: pago.idprestamo,
          monto: decimalToNumber(pago.monto),
          moneda: pago.moneda,
          aplicado: pago.aplicado,
        },
      });

      return ctx.prisma.tbl_pago.findUniqueOrThrow({
        ...(query as Record<string, unknown>),
        where: { idpago: pago.idpago },
      }) as never;
    },
  }),
);

builder.mutationField('marcarPagoAplicado', (t) =>
  t.prismaField({
    type: Pago,
    args: {
      idpago: t.arg.int({ required: true }),
      aplicado: t.arg.boolean({ required: true }),
    },
    resolve: async (query, _parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.PAGO_APPLY);
      const { idpago, aplicado } = MarcarPagoAplicadoSchema.parse(args);
      const pago = await ctx.prisma.tbl_pago.findUnique({
        where: { idpago },
      });
      if (!pago || pago.deletedAt) {
        throw new GraphQLValidationError('Pago no encontrado.');
      }
      await requerirAccesoMandante(ctx.usuario?.idusuario, pago.idmandante);
      await requerirAccesoPrestamoCobrador(
        ctx.usuario?.idusuario,
        pago.idprestamo,
      );

      if (pago.aplicado === aplicado) {
        return ctx.prisma.tbl_pago.findUniqueOrThrow({
          ...(query as Record<string, unknown>),
          where: { idpago },
        }) as never;
      }

      const monto = decimalToNumber(pago.monto);

      await ctx.prisma.$transaction(async (tx) => {
        let idacuerdo = pago.idacuerdo;

        if (aplicado && !idacuerdo) {
          const acuerdoVigente = await tx.tbl_acuerdo.findFirst({
            where: {
              idprestamo: pago.idprestamo,
              estado: 'VIGENTE',
              deletedAt: null,
            },
          });
          if (acuerdoVigente) {
            idacuerdo = acuerdoVigente.idacuerdo;
          }
        }

        if (aplicado) {
          await validarPagoAnticipado(tx, {
            idprestamo: pago.idprestamo,
            monto,
            fechaPago: pago.fechaPago,
          });
          const marcado = await marcarPagoComoAplicadoAtomico(tx, idpago, {
            idacuerdo,
          });
          if (!marcado) {
            return;
          }
          await aplicarPagoAlPrestamo(tx, {
            idprestamo: pago.idprestamo,
            monto,
            fechaPago: pago.fechaPago,
            idacuerdo,
            idpago,
            idusuario: ctx.usuario?.idusuario,
          });
        } else {
          const desmarcado = await marcarPagoComoNoAplicadoAtomico(tx, idpago);
          if (!desmarcado) {
            return;
          }
          await revertirPagoDelPrestamo(tx, {
            idprestamo: pago.idprestamo,
            monto,
            idpago,
            idusuario: ctx.usuario?.idusuario,
          });
        }

        await registrarAuditoria(tx, {
          idusuario: ctx.usuario?.idusuario,
          entidad: 'tbl_pago',
          entidadId: idpago,
          accion: aplicado ? 'CONCILIAR' : 'DESCONCILIAR',
          detalle: JSON.stringify({ monto, idprestamo: pago.idprestamo }),
        });
      });

      return ctx.prisma.tbl_pago.findUniqueOrThrow({
        ...(query as Record<string, unknown>),
        where: { idpago },
      }) as never;
    },
  }),
);
