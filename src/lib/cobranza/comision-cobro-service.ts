import type { tbl_comision_cobro } from '@prisma/client';
import { decimalToNumber, roundMoney } from './decimal-utils';

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
