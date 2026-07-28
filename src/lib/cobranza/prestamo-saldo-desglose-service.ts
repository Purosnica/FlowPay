import type { PrismaClient } from '@prisma/client';
import { decimalToNumber, roundMoney } from './decimal-utils';
import {
  calcularDesgloseSaldo,
  type DesgloseSaldoPrestamoDetalle,
  type PagoAplicadoDesglose,
} from './prestamo-saldo-desglose';

export async function obtenerDesgloseSaldoPrestamo(
  db: PrismaClient,
  idprestamo: number,
): Promise<DesgloseSaldoPrestamoDetalle | null> {
  const prestamo = await db.tbl_prestamo.findFirst({
    where: { idprestamo, deletedAt: null },
    select: {
      montoPrestamo: true,
      interes: true,
      gestionCobranza: true,
      comisionCav: true,
      comisionInsitu: true,
      mantenimientoValor: true,
      seguroSvsd: true,
      cargosAdmin: true,
      devolucionSaldoFavor: true,
      descuentosArchivo: true,
      interesMoratorio: true,
      saldoTotal: true,
    },
  });

  if (!prestamo) {
    return null;
  }

  const [pagosRows, acuerdoVigente] = await Promise.all([
    db.tbl_pago.findMany({
      where: {
        idprestamo,
        aplicado: true,
        deletedAt: null,
      },
      select: {
        idpago: true,
        fechaPago: true,
        monto: true,
        medio: true,
        folio: true,
      },
      orderBy: { fechaPago: 'desc' },
    }),
    db.tbl_acuerdo.findFirst({
      where: {
        idprestamo,
        estado: 'VIGENTE',
        deletedAt: null,
      },
      select: {
        montoDescuento: true,
        dispensarInteresMoratorio: true,
        dispensarGestionCobranza: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const pagosAplicados: PagoAplicadoDesglose[] = pagosRows.map((p) => ({
    idpago: p.idpago,
    fechaPago: p.fechaPago,
    monto: decimalToNumber(p.monto),
    medio: p.medio,
    folio: p.folio,
  }));

  const totalPagosAplicados = roundMoney(
    pagosAplicados.reduce((sum, p) => sum + p.monto, 0),
  );

  const interesMoratorio = decimalToNumber(prestamo.interesMoratorio);
  const gestionCobranza = decimalToNumber(prestamo.gestionCobranza);
  const saldoRegistrado = decimalToNumber(prestamo.saldoTotal);

  const desglose = calcularDesgloseSaldo({
    montoPrestamo: decimalToNumber(prestamo.montoPrestamo),
    interes: decimalToNumber(prestamo.interes),
    gestionCobranza,
    comisionCav: decimalToNumber(prestamo.comisionCav),
    comisionInsitu: decimalToNumber(prestamo.comisionInsitu),
    mantenimientoValor: decimalToNumber(prestamo.mantenimientoValor),
    seguroSvsd: decimalToNumber(prestamo.seguroSvsd),
    cargosAdmin: decimalToNumber(prestamo.cargosAdmin),
    devolucionSaldoFavor: decimalToNumber(prestamo.devolucionSaldoFavor),
    descuentosArchivo: decimalToNumber(prestamo.descuentosArchivo),
    interesMoratorio,
    totalPagosAplicados,
    saldoRegistrado,
    descuentoAcuerdoVigente: acuerdoVigente
      ? decimalToNumber(acuerdoVigente.montoDescuento)
      : 0,
  });

  if (acuerdoVigente) {
    let baseAcuerdo = saldoRegistrado;
    if (!acuerdoVigente.dispensarInteresMoratorio) {
      baseAcuerdo += interesMoratorio;
    }
    if (acuerdoVigente.dispensarGestionCobranza) {
      baseAcuerdo = Math.max(0, baseAcuerdo - gestionCobranza);
    }
    return {
      ...desglose,
      baseAcuerdo: Math.round(baseAcuerdo * 100) / 100,
      pagosAplicados,
    };
  }

  return { ...desglose, pagosAplicados };
}

export async function obtenerTotalesPagosPorPrestamos(
  db: PrismaClient,
  idsPrestamo: number[],
): Promise<Map<number, number>> {
  const mapa = new Map<number, number>();
  if (idsPrestamo.length === 0) {
    return mapa;
  }

  const pagos = await db.tbl_pago.groupBy({
    by: ['idprestamo'],
    where: {
      idprestamo: { in: idsPrestamo },
      aplicado: true,
      deletedAt: null,
    },
    _sum: { monto: true },
  });

  for (const fila of pagos) {
    mapa.set(fila.idprestamo, decimalToNumber(fila._sum.monto));
  }

  return mapa;
}

export async function obtenerDescuentosAcuerdoPorPrestamos(
  db: PrismaClient,
  idsPrestamo: number[],
): Promise<Map<number, number>> {
  const mapa = new Map<number, number>();
  if (idsPrestamo.length === 0) {
    return mapa;
  }

  const acuerdos = await db.tbl_acuerdo.findMany({
    where: {
      idprestamo: { in: idsPrestamo },
      estado: 'VIGENTE',
      deletedAt: null,
    },
    select: {
      idprestamo: true,
      montoDescuento: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  for (const acuerdo of acuerdos) {
    if (!mapa.has(acuerdo.idprestamo)) {
      mapa.set(acuerdo.idprestamo, decimalToNumber(acuerdo.montoDescuento));
    }
  }

  return mapa;
}
