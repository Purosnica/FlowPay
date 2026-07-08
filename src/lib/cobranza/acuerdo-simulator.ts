/**
 * Simulador de acuerdos / descuentos.
 * Replica la lógica de la FICHA DE REGISTRO del Excel:
 *   base = saldoTotal + interesMoratorio
 *   descuento = base * porcentajeDesc
 *   acordado = base - descuento
 *   cuota = acordado / numeroCuotas
 *   pagoMinimo = cuota / 2
 */

import { roundMoney } from "./decimal-utils";

export interface SimulacionAcuerdoInput {
  saldoTotal: number;
  interesMoratorio: number;
  porcentajeDesc: number;
  numeroCuotas: number;
}

export interface SimulacionAcuerdoResult {
  baseNegociable: number;
  montoDescuento: number;
  montoAcordado: number;
  montoCuota: number;
  pagoMinimo: number;
}

export function simularAcuerdo(input: SimulacionAcuerdoInput): SimulacionAcuerdoResult {
  const { saldoTotal, interesMoratorio, porcentajeDesc, numeroCuotas } = input;

  if (numeroCuotas < 1) {
    throw new Error("El número de cuotas debe ser al menos 1.");
  }
  if (porcentajeDesc < 0 || porcentajeDesc > 100) {
    throw new Error("El porcentaje de descuento debe estar entre 0 y 100.");
  }

  const baseNegociable = roundMoney(saldoTotal + interesMoratorio);
  const montoDescuento = roundMoney(baseNegociable * (porcentajeDesc / 100));
  const montoAcordado = roundMoney(baseNegociable - montoDescuento);
  const montoCuota = roundMoney(montoAcordado / numeroCuotas);
  const pagoMinimo = roundMoney(montoCuota / 2);

  return {
    baseNegociable,
    montoDescuento,
    montoAcordado,
    montoCuota,
    pagoMinimo,
  };
}
