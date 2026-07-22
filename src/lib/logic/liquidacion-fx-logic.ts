/**
 * Conversión FX para liquidación (H25).
 * tipoCambio = unidades de moneda base por 1 unidad de moneda extranjera.
 */

import { roundMoney } from '@/lib/cobranza/decimal-utils';

export const MONEDA_BASE_LIQUIDACION = 'NIO';

export type ResultadoConversionLiquidacion = {
  montoBase: number;
  tipoCambioAplicado: number;
  monedaOriginal: string;
};

export function normalizarMonedaLiquidacion(moneda: string | null | undefined): string {
  const m = (moneda ?? MONEDA_BASE_LIQUIDACION).trim().toUpperCase();
  return m === 'USD' || m === 'NIO' ? m : MONEDA_BASE_LIQUIDACION;
}

/**
 * Convierte monto de pago a moneda base de liquidación (NIO por defecto).
 * Fail-closed si la moneda no es base y falta tipoCambio > 0.
 */
export function convertirMontoAMonedaBase(params: {
  monto: number;
  moneda: string | null | undefined;
  tipoCambio: number | null | undefined;
  monedaBase?: string;
}): ResultadoConversionLiquidacion {
  const monedaOriginal = normalizarMonedaLiquidacion(params.moneda);
  const base = normalizarMonedaLiquidacion(
    params.monedaBase ?? MONEDA_BASE_LIQUIDACION,
  );

  if (monedaOriginal === base) {
    return {
      montoBase: roundMoney(params.monto),
      tipoCambioAplicado: 1,
      monedaOriginal,
    };
  }

  const tc = params.tipoCambio;
  if (tc == null || !(tc > 0) || !Number.isFinite(tc)) {
    throw new Error(
      `Pago en ${monedaOriginal} sin tipoCambio válido para liquidar en ${base}.`,
    );
  }

  return {
    montoBase: roundMoney(params.monto * tc),
    tipoCambioAplicado: tc,
    monedaOriginal,
  };
}
