/**
 * Meta pagable de un acuerdo contra el ledger (H12).
 * El moratorio fuera de saldoTotal no puede exigirse en cash vía pagos.
 */

import { roundMoney } from '@/lib/cobranza/decimal-utils';

export function calcularMetaPagableAcuerdo(params: {
  montoAcordado: number;
  saldoActual: number;
  totalPagado: number;
  dispensarInteresMoratorio: boolean;
}): number {
  const acordado = roundMoney(params.montoAcordado);
  if (params.dispensarInteresMoratorio) {
    return acordado;
  }
  const topeLedger = roundMoney(
    Math.max(0, params.saldoActual) + Math.max(0, params.totalPagado),
  );
  return roundMoney(Math.min(acordado, topeLedger));
}

export function acuerdoCumplidoPorPagos(params: {
  montoAcordado: number;
  saldoActual: number;
  totalPagado: number;
  dispensarInteresMoratorio: boolean;
  tolerancia?: number;
}): boolean {
  const tol = params.tolerancia ?? 0.009;
  const meta = calcularMetaPagableAcuerdo(params);
  return roundMoney(params.totalPagado) + tol >= meta;
}
