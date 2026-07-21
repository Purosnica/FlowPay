/**
 * Lógica pura del comprobante de pago (sin acceso a BD).
 */

import { roundMoney } from '@/lib/cobranza/decimal-utils';

export function folioComprobantePago(idpago: number): string {
  return `FP-${String(idpago).padStart(8, '0')}`;
}

export function rutaComprobantePago(idpago: number): string {
  return `/cobranza/pagos/${idpago}/comprobante`;
}

export function formatearFechaComprobante(
  fecha: Date | string,
): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.toLocaleDateString('es-NI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatearFechaHoraComprobante(
  fecha: Date | string,
): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.toLocaleString('es-NI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Reconstruye saldos al momento del pago.
 * - Si el pago ya está aplicado: deshace pagos aplicados posteriores.
 * - Si aún no aplica: proyecta el saldo nuevo restando el abono.
 */
export function calcularSaldosComprobante(params: {
  saldoActual: number;
  montoPago: number;
  pagoAplicado: boolean;
  montosPagosAplicadosPosteriores: number;
}): { saldoAnterior: number; saldoNuevo: number } {
  const saldoActual = roundMoney(params.saldoActual);
  const monto = roundMoney(params.montoPago);
  const posteriores = roundMoney(params.montosPagosAplicadosPosteriores);

  const saldoTrasEsteContexto = roundMoney(saldoActual + posteriores);

  if (params.pagoAplicado) {
    return {
      saldoAnterior: roundMoney(saldoTrasEsteContexto + monto),
      saldoNuevo: saldoTrasEsteContexto,
    };
  }

  return {
    saldoAnterior: saldoTrasEsteContexto,
    saldoNuevo: roundMoney(Math.max(0, saldoTrasEsteContexto - monto)),
  };
}

export function esPagoPosteriorAlComprobante(params: {
  fechaPagoReferencia: Date;
  idpagoReferencia: number;
  fechaPago: Date;
  idpago: number;
}): boolean {
  const tRef = params.fechaPagoReferencia.getTime();
  const t = params.fechaPago.getTime();
  if (t > tRef) {
    return true;
  }
  if (t < tRef) {
    return false;
  }
  return params.idpago > params.idpagoReferencia;
}
