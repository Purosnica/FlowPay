/**
 * Lógica de condonación residual al cumplir un acuerdo.
 */

import { roundMoney } from '@/lib/cobranza/decimal-utils';

export const TOLERANCIA_CONDONACION = 0.009;

export function debeCondonarResidualTrasAcuerdo(
  saldoTotal: number,
): boolean {
  return roundMoney(saldoTotal) > TOLERANCIA_CONDONACION;
}

export function montosCondonacionResidual(params: {
  saldoTotal: number;
  interesMoratorio: number;
}): {
  saldoCondonado: number;
  moratorioCondonado: number;
} {
  return {
    saldoCondonado: roundMoney(Math.max(0, params.saldoTotal)),
    moratorioCondonado: roundMoney(Math.max(0, params.interesMoratorio)),
  };
}
