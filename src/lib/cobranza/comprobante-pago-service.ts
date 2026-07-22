/**
 * Obtiene los datos del comprobante de pago con control de acceso.
 */

import { prisma } from '@/lib/prisma';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { filtroMandante, requerirAccesoMandante } from './mandante-scope';
import { requerirAccesoPrestamoCobrador } from './cobrador-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import {
  calcularSaldosComprobante,
  esPagoPosteriorAlComprobante,
  folioComprobantePago,
  rutaComprobantePago,
} from '@/lib/logic/comprobante-pago-logic';
import { nombreCompletoCliente } from '@/types/cobranza';

export interface ComprobantePagoData {
  idpago: number;
  idprestamo: number;
  folio: string;
  fechaPago: Date;
  fechaRegistro: Date;
  monto: number;
  moneda: string;
  saldoAnterior: number;
  saldoNuevo: number;
  reciboUrl: string;
  noPrestamo: string;
  codigoUnico: string;
  nombreCliente: string;
  numerodocumento: string;
  mandanteNombre: string;
  mandanteCodigo: string;
  mandanteRuc: string | null;
  gestorNombre: string | null;
}

export async function obtenerComprobantePago(
  idusuario: number,
  idpago: number,
): Promise<ComprobantePagoData> {
  const mandanteFilter = await filtroMandante(idusuario);

  const pago = await prisma.tbl_pago.findFirst({
    where: {
      idpago,
      deletedAt: null,
      idmandante: mandanteFilter,
    },
    include: {
      gestor: { select: { nombre: true } },
      mandante: {
        select: { nombre: true, codigo: true, ruc: true },
      },
      prestamo: {
        select: {
          idprestamo: true,
          noPrestamo: true,
          codigoUnico: true,
          saldoTotal: true,
          cliente: {
            select: {
              idcliente: true,
              primer_nombres: true,
              segundo_nombres: true,
              primer_apellido: true,
              segundo_apellido: true,
              numerodocumento: true,
              celular: true,
              telefono: true,
            },
          },
        },
      },
    },
  });

  if (!pago) {
    throw new GraphQLValidationError('Pago no encontrado.');
  }

  await requerirAccesoMandante(idusuario, pago.idmandante);
  await requerirAccesoPrestamoCobrador(idusuario, pago.idprestamo);

  const pagosAplicados = await prisma.tbl_pago.findMany({
    where: {
      idprestamo: pago.idprestamo,
      deletedAt: null,
      aplicado: true,
      idpago: { not: pago.idpago },
    },
    select: {
      idpago: true,
      fechaPago: true,
      monto: true,
    },
  });

  const montosPosteriores = pagosAplicados
    .filter((p) =>
      esPagoPosteriorAlComprobante({
        fechaPagoReferencia: pago.fechaPago,
        idpagoReferencia: pago.idpago,
        fechaPago: p.fechaPago,
        idpago: p.idpago,
      }),
    )
    .reduce((acc, p) => acc + decimalToNumber(p.monto), 0);

  const { saldoAnterior, saldoNuevo } = calcularSaldosComprobante({
    saldoActual: decimalToNumber(pago.prestamo.saldoTotal),
    montoPago: decimalToNumber(pago.monto),
    pagoAplicado: pago.aplicado,
    montosPagosAplicadosPosteriores: montosPosteriores,
  });

  const reciboUrl =
    pago.reciboUrl?.trim() || rutaComprobantePago(pago.idpago);

  return {
    idpago: pago.idpago,
    idprestamo: pago.idprestamo,
    folio: pago.folio || folioComprobantePago(pago.idpago),
    fechaPago: pago.fechaPago,
    fechaRegistro: pago.createdAt,
    monto: roundMoney(decimalToNumber(pago.monto)),
    moneda: pago.moneda,
    saldoAnterior,
    saldoNuevo,
    reciboUrl,
    noPrestamo: pago.prestamo.noPrestamo,
    codigoUnico: pago.prestamo.codigoUnico,
    nombreCliente: nombreCompletoCliente(pago.prestamo.cliente),
    numerodocumento: pago.prestamo.cliente.numerodocumento,
    mandanteNombre: pago.mandante.nombre,
    mandanteCodigo: pago.mandante.codigo,
    mandanteRuc: pago.mandante.ruc,
    gestorNombre: pago.gestor?.nombre ?? null,
  };
}
