import type { tbl_comision_cobro } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decimalToNumber, roundMoney } from './decimal-utils';
import {
  formatTramoMoraLabel,
  type TramoMoraDef,
} from './tramos-mora';

export interface ComisionTramo {
  tramoMoraMin: number;
  tramoMoraMax: number | null;
  porcentaje: number;
}

export interface ResultadoComisionCobrador {
  porcentajeRecuperacion: number;
  ingresoEmpresa: number;
  porcentajeComisionCobrador: number;
  montoComision: number;
}

export function mapComisiones(
  rows: tbl_comision_cobro[],
): ComisionTramo[] {
  return rows
    .filter((r) => r.estado && !r.deletedAt)
    .map((r) => ({
      tramoMoraMin: r.tramoMoraMin,
      tramoMoraMax: r.tramoMoraMax,
      porcentaje: decimalToNumber(r.porcentaje),
    }))
    .sort((a, b) => a.tramoMoraMin - b.tramoMoraMin);
}

/** Tramos de % recuperación activos del Mandante. */
export async function cargarTramosRecuperacionMandante(
  idmandante: number,
): Promise<ComisionTramo[]> {
  const rows = await prisma.tbl_comision_cobro.findMany({
    where: { idmandante, deletedAt: null, estado: true },
  });
  return mapComisiones(rows);
}

/** Tramos de % recuperación por varios Mandantes. */
export async function cargarTramosRecuperacionPorMandantes(
  idsMandante: number[],
): Promise<Map<number, ComisionTramo[]>> {
  const map = new Map<number, ComisionTramo[]>();
  if (idsMandante.length === 0) {
    return map;
  }
  const rows = await prisma.tbl_comision_cobro.findMany({
    where: {
      idmandante: { in: idsMandante },
      deletedAt: null,
      estado: true,
    },
  });
  for (const id of idsMandante) {
    map.set(
      id,
      mapComisiones(rows.filter((r) => r.idmandante === id)),
    );
  }
  return map;
}

/** Convierte tramos de comisión a defs de reporte (misma banda y etiqueta). */
export function comisionTramosADefs(
  tramos: ComisionTramo[],
): TramoMoraDef[] {
  return tramos.map((t) => ({
    tramo: formatTramoMoraLabel(t.tramoMoraMin, t.tramoMoraMax),
    tramoMoraMin: t.tramoMoraMin,
    tramoMoraMax: t.tramoMoraMax,
  }));
}

/**
 * Resuelve el % de recuperación para la empresa según días de mora.
 */
export function resolverPorcentajeRecuperacion(
  tramos: ComisionTramo[],
  diasMora: number,
): number {
  const tramo = tramos.find(
    (c) =>
      diasMora >= c.tramoMoraMin &&
      (c.tramoMoraMax === null || diasMora <= c.tramoMoraMax),
  );
  return tramo?.porcentaje ?? 0;
}

export function calcularIngresoEmpresa(
  montoRecuperado: number,
  porcentajeRecuperacion: number,
): number {
  return roundMoney(montoRecuperado * (porcentajeRecuperacion / 100));
}

export function calcularComisionCobrador(
  montoRecuperado: number,
  porcentajeRecuperacion: number,
  porcentajeComisionCobrador: number,
): ResultadoComisionCobrador {
  const ingresoEmpresa = calcularIngresoEmpresa(
    montoRecuperado,
    porcentajeRecuperacion,
  );
  const montoComision = roundMoney(
    ingresoEmpresa * (porcentajeComisionCobrador / 100),
  );
  return {
    porcentajeRecuperacion,
    ingresoEmpresa,
    porcentajeComisionCobrador,
    montoComision,
  };
}

export function calcularComisionPago(
  monto: number,
  diasMora: number,
  tramosRecuperacion: ComisionTramo[],
  porcentajeComisionCobrador: number,
): ResultadoComisionCobrador {
  const porcentajeRecuperacion = resolverPorcentajeRecuperacion(
    tramosRecuperacion,
    diasMora,
  );
  return calcularComisionCobrador(
    monto,
    porcentajeRecuperacion,
    porcentajeComisionCobrador,
  );
}
