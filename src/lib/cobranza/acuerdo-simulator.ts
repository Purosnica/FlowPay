/**
 * Simulador de acuerdos CREDICOMPRAS (FICHA DE REGISTRO).
 *
 * SaldoTotal del archivo ya incluye: capital + interés + gestión + cargos − pagos.
 * El interés moratorio va aparte y se suma a la base del acuerdo si no se dispensa.
 * Si se dispensa gestión de cobranza, se resta porque ya está dentro del SaldoTotal.
 */

import { roundMoney } from './decimal-utils';

export interface SimulacionAcuerdoInput {
  saldoTotal: number;
  interesMoratorio: number;
  gestionCobranza?: number;
  porcentajeDesc: number;
  numeroCuotas: number;
  dispensarInteresMoratorio?: boolean;
  dispensarGestionCobranza?: boolean;
}

export interface SimulacionAcuerdoResult {
  baseNegociable: number;
  montoDescuento: number;
  montoAcordado: number;
  montoCuota: number;
  pagoMinimo: number;
  interesMoratorioExcluido: number;
  gestionCobranzaExcluida: number;
}

export function simularAcuerdo(
  input: SimulacionAcuerdoInput,
): SimulacionAcuerdoResult {
  const {
    saldoTotal,
    interesMoratorio,
    gestionCobranza = 0,
    porcentajeDesc,
    numeroCuotas,
    dispensarInteresMoratorio = false,
    dispensarGestionCobranza = false,
  } = input;

  if (numeroCuotas < 1) {
    throw new Error('El número de cuotas debe ser al menos 1.');
  }
  if (porcentajeDesc < 0 || porcentajeDesc > 100) {
    throw new Error('El porcentaje de descuento debe estar entre 0 y 100.');
  }

  const interesMoratorioExcluido = dispensarInteresMoratorio
    ? roundMoney(interesMoratorio)
    : 0;
  const gestionCobranzaExcluida = dispensarGestionCobranza
    ? roundMoney(gestionCobranza)
    : 0;

  let baseNegociable = roundMoney(saldoTotal);
  if (!dispensarInteresMoratorio) {
    baseNegociable = roundMoney(baseNegociable + interesMoratorio);
  }
  if (dispensarGestionCobranza) {
    baseNegociable = roundMoney(
      Math.max(0, baseNegociable - gestionCobranza),
    );
  }

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
    interesMoratorioExcluido,
    gestionCobranzaExcluida,
  };
}
