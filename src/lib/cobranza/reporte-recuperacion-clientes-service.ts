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

/**
 * Depósitos aplicados en el período. Cada fila representa un depósito para
 * conservar su fecha, medio bancario y monto de abono auditables.
 */
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
    orderBy: [{ fechaPago: 'desc' }, { idpago: 'desc' }],
    select: {
      idpago: true,
      fechaPago: true,
      monto: true,
      medio: true,
      referenciaBancaria: true,
      gestor: { select: { nombre: true } },
      prestamo: {
        select: {
          idmandante: true,
          codigoUnico: true,
          montoPrestamo: true,
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

  // Las definiciones de tramo dependen del mandante. Se consultan solo para
  // los mandantes presentes en los depósitos del resultado.
  const idsMandante = [...new Set(pagos.map((p) => p.prestamo.idmandante))];
  const defs = idsMandante.length
    ? await prisma.tbl_comision_cobro.findMany({
        where: { idmandante: { in: idsMandante }, deletedAt: null },
        select: { idmandante: true, tramoMoraMin: true, tramoMoraMax: true },
      })
    : [];
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

  const registros: ReporteRecuperacionClienteItem[] = pagos.map((p) => {
    const prestamo = p.prestamo;
    const tramo = resolverTramoMoraDef(
      tramosPorMandante.get(prestamo.idmandante) ?? [],
      prestamo.diasMora
    );
    const saldoInicial = decimalToNumber(prestamo.montoPrestamo);
    const montoAbonado = decimalToNumber(p.monto);
    const saldoPendiente = decimalToNumber(prestamo.saldoTotal);
    return {
      idpago: p.idpago,
      nombreCliente: formatNombreClienteDisplay(prestamo.cliente),
      codigoUnico: prestamo.codigoUnico,
      saldoInicial: roundMoney(saldoInicial),
      ejecutivo: p.gestor?.nombre ?? prestamo.gestor?.nombre ?? '—',
      fechaDeposito: fechaIso(p.fechaPago),
      tramoMora: tramo
        ? formatTramoMoraLabel(tramo.tramoMoraMin, tramo.tramoMoraMax)
        : `${prestamo.diasMora} días`,
      sucursal: prestamo.agencia?.nombre ?? '—',
      banco: p.referenciaBancaria?.trim() || p.medio?.trim() || '—',
      interesesMoratorios: roundMoney(decimalToNumber(prestamo.interesMoratorio)),
      descuentos: roundMoney(decimalToNumber(prestamo.descuentosArchivo)),
      saldoALaFecha: roundMoney(saldoPendiente),
      montoAbonado: roundMoney(montoAbonado),
      saldoPendiente: roundMoney(saldoPendiente),
      porcentajeRecuperado: saldoInicial > 0 ? roundMoney((montoAbonado / saldoInicial) * 100) : 0,
    };
  });
  const totalAbonado = roundMoney(registros.reduce((total, r) => total + r.montoAbonado, 0));
  const saldoInicialTotal = registros.reduce((total, r) => total + r.saldoInicial, 0);
  return {
    periodo,
    totalDepositos: registros.length,
    totalAbonado,
    saldoPendienteTotal: roundMoney(registros.reduce((total, r) => total + r.saldoPendiente, 0)),
    recuperacionPct:
      saldoInicialTotal > 0 ? roundMoney((totalAbonado / saldoInicialTotal) * 100) : 0,
    registros,
  };
}
