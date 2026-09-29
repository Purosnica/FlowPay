import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  buildClienteSearchOr,
  CLIENTE_NOMBRE_SELECT,
  formatNombreClienteDisplay,
} from '@/lib/logic/cliente-tipo-persona-logic';
import { filtroMandante } from './mandante-scope';
import { wherePrestamoPorRol } from './cobrador-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import { formatTramoMoraLabel, resolverTramoMoraDef, type TramoMoraDef } from './tramos-mora';
import type { ReporteRecuperacionClienteItem, ReporteRecuperacionClientes } from '@/types/cobranza';

export interface FiltrosReporteRecuperacionClientes {
  periodo: string;
  search?: string | null;
}

function fechaIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Cada fila es un pago: saldo inicial - abono = saldo pendiente. */
export async function obtenerReporteRecuperacionClientes(
  idusuario: number,
  filtros: FiltrosReporteRecuperacionClientes
): Promise<ReporteRecuperacionClientes> {
  const { inicio, fin, periodo } = parsePeriodo(filtros.periodo);
  const [mandanteFilter, rolFilter] = await Promise.all([
    filtroMandante(idusuario),
    wherePrestamoPorRol(idusuario),
  ]);
  const search = filtros.search?.trim();
  const where: Prisma.tbl_pagoWhereInput = {
    deletedAt: null,
    aplicado: true,
    fechaPago: { gte: inicio, lt: fin },
    prestamo: {
      deletedAt: null,
      idmandante: mandanteFilter,
      ...rolFilter,
      ...(search ? { cliente: { OR: buildClienteSearchOr(search) } } : {}),
    },
  };
  const pagos = await prisma.tbl_pago.findMany({
    where,
    orderBy: [{ fechaPago: 'asc' }, { idpago: 'asc' }],
    select: {
      idpago: true,
      idprestamo: true,
      fechaPago: true,
      monto: true,
      medio: true,
      referenciaBancaria: true,
      gestor: { select: { nombre: true } },
      prestamo: {
        select: {
          idmandante: true,
          codigoUnico: true,
          saldoTotal: true,
          diasMora: true,
          interesMoratorio: true,
          descuentosArchivo: true,
          gestor: { select: { nombre: true } },
          agencia: { select: { nombre: true } },
          cliente: { select: { ...CLIENTE_NOMBRE_SELECT } },
        },
      },
    },
  });
  const idsMandante = [...new Set(pagos.map((p) => p.prestamo.idmandante))];
  const idsPago = pagos.map((p) => p.idpago);
  const idsPrestamo = [...new Set(pagos.map((p) => p.idprestamo))];
  const [defs, movimientos, pagosHistoricos] = await Promise.all([
    idsMandante.length
      ? prisma.tbl_comision_cobro.findMany({
          where: { idmandante: { in: idsMandante }, deletedAt: null },
          select: { idmandante: true, tramoMoraMin: true, tramoMoraMax: true },
        })
      : Promise.resolve([]),
    idsPago.length
      ? prisma.tbl_movimiento_financiero.findMany({
          where: { idpago: { in: idsPago }, tipoMovimiento: 'PAGO' },
          select: { idpago: true, saldoAnterior: true, saldoPosterior: true },
        })
      : Promise.resolve([]),
    idsPrestamo.length
      ? prisma.tbl_pago.groupBy({
          by: ['idprestamo'],
          where: {
            idprestamo: { in: idsPrestamo },
            aplicado: true,
            deletedAt: null,
          },
          _sum: { monto: true },
        })
      : Promise.resolve([]),
  ]);
  const movimientosPorPago = new Map(
    movimientos.filter((m) => m.idpago != null).map((m) => [m.idpago as number, m])
  );
  const tramosPorMandante = new Map<number, TramoMoraDef[]>();
  for (const def of defs) {
    const actuales = tramosPorMandante.get(def.idmandante) ?? [];
    actuales.push({
      tramo: formatTramoMoraLabel(def.tramoMoraMin, def.tramoMoraMax),
      tramoMoraMin: def.tramoMoraMin,
      tramoMoraMax: def.tramoMoraMax,
    });
    tramosPorMandante.set(def.idmandante, actuales);
  }
  // Monto fijo del crédito: saldo de apertura en el libro mayor. Para cartera
  // histórica, el primer pago guarda el saldo que existía antes de abonarlo.
  const montoOriginalPorPrestamo = new Map<number, number>();
  const saldoActualPorPrestamo = new Map<number, number>();
  for (const pago of pagos) {
    saldoActualPorPrestamo.set(pago.idprestamo, decimalToNumber(pago.prestamo.saldoTotal));
  }
  for (const pagoHistorico of pagosHistoricos) {
    montoOriginalPorPrestamo.set(
      pagoHistorico.idprestamo,
      roundMoney(
        (saldoActualPorPrestamo.get(pagoHistorico.idprestamo) ?? 0) +
          decimalToNumber(pagoHistorico._sum.monto)
      )
    );
  }

  // Fallback para históricos sin ledger: reconstruye la secuencia usando el saldo actual + abonos del rango.
  const abonosPorPrestamo = new Map<number, number>();
  for (const pago of pagos)
    abonosPorPrestamo.set(
      pago.idprestamo,
      (abonosPorPrestamo.get(pago.idprestamo) ?? 0) + decimalToNumber(pago.monto)
    );
  const saldoFallbackPorPrestamo = new Map<number, number>();
  const registros: ReporteRecuperacionClienteItem[] = pagos.map((pago) => {
    const prestamo = pago.prestamo;
    const montoAbonado = roundMoney(decimalToNumber(pago.monto));
    const movimiento = movimientosPorPago.get(pago.idpago);
    const saldoInicial = movimiento
      ? decimalToNumber(movimiento.saldoAnterior)
      : (saldoFallbackPorPrestamo.get(pago.idprestamo) ??
        roundMoney(
          decimalToNumber(prestamo.saldoTotal) + (abonosPorPrestamo.get(pago.idprestamo) ?? 0)
        ));
    const saldoPosterior = movimiento
      ? decimalToNumber(movimiento.saldoPosterior)
      : roundMoney(saldoInicial - montoAbonado);
    saldoFallbackPorPrestamo.set(pago.idprestamo, saldoPosterior);
    const montoOriginal = montoOriginalPorPrestamo.get(pago.idprestamo) ?? saldoInicial;
    const tramo = resolverTramoMoraDef(
      tramosPorMandante.get(prestamo.idmandante) ?? [],
      prestamo.diasMora
    );
    return {
      idpago: pago.idpago,
      nombreCliente: formatNombreClienteDisplay(prestamo.cliente),
      codigoUnico: prestamo.codigoUnico,
      saldoInicial: roundMoney(montoOriginal),
      ejecutivo: pago.gestor?.nombre ?? prestamo.gestor?.nombre ?? '—',
      fechaDeposito: fechaIso(pago.fechaPago),
      tramoMora: tramo?.tramo ?? `${prestamo.diasMora} días`,
      sucursal: prestamo.agencia?.nombre ?? '—',
      banco: pago.referenciaBancaria?.trim() || pago.medio?.trim() || '—',
      interesesMoratorios: roundMoney(decimalToNumber(prestamo.interesMoratorio)),
      descuentos: roundMoney(decimalToNumber(prestamo.descuentosArchivo)),
      saldoALaFecha: roundMoney(saldoPosterior),
      montoAbonado,
      saldoPendiente: roundMoney(saldoPosterior),
      porcentajeRecuperado:
        montoOriginal > 0 ? roundMoney((montoAbonado / montoOriginal) * 100) : 0,
    };
  });
  const saldoInicialPorPrestamo = new Map<number, number>();
  const saldoPendientePorPrestamo = new Map<number, number>();
  registros.forEach((registro, index) => {
    const idprestamo = pagos[index].idprestamo;
    if (!saldoInicialPorPrestamo.has(idprestamo))
      saldoInicialPorPrestamo.set(idprestamo, registro.saldoInicial);
    saldoPendientePorPrestamo.set(idprestamo, registro.saldoPendiente);
  });
  const totalAbonado = roundMoney(registros.reduce((total, r) => total + r.montoAbonado, 0));
  const saldoInicialTotal = [...saldoInicialPorPrestamo.values()].reduce(
    (total, saldo) => total + saldo,
    0
  );
  return {
    periodo,
    totalDepositos: pagos.length,
    totalAbonado,
    saldoPendienteTotal: roundMoney(
      [...saldoPendientePorPrestamo.values()].reduce((total, saldo) => total + saldo, 0)
    ),
    recuperacionPct:
      saldoInicialTotal > 0 ? roundMoney((totalAbonado / saldoInicialTotal) * 100) : 0,
    registros,
  };
}
