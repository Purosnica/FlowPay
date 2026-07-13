/**
 * Sustitución de variables en plantillas de cobro (WhatsApp / SMS / Email).
 */

import { simularAcuerdo } from './acuerdo-simulator';
import {
  formatearMoneda,
  type Acuerdo,
  type Prestamo,
  type PrestamoCliente,
} from '@/types/cobranza';

export const PLANTILLA_VARIABLES_AYUDA = [
  '{{nombre}}',
  '{{prestamo}}',
  '{{documento}}',
  '{{saldo}}',
  '{{diasMora}}',
  '{{interesMoratorio}}',
  '{{baseNegociable}}',
  '{{montoAcordado}}',
  '{{montoDescuento}}',
  '{{montoCuota}}',
  '{{pagoMinimo}}',
  '{{telefono}}',
  '{{celular}}',
  '{{email}}',
  '{{mandante}}',
  '{{moneda}}',
  '{{fechaVencimiento}}',
  '{{fechaLimite}}',
] as const;

export type PlantillaMensajeContext = {
  prestamo: Pick<
    Prestamo,
    | 'noPrestamo'
    | 'saldoTotal'
    | 'diasMora'
    | 'interesMoratorio'
    | 'gestionCobranza'
    | 'moneda'
    | 'fechaVencimiento'
  >;
  cliente?: Pick<
    PrestamoCliente,
    | 'primer_nombres'
    | 'segundo_nombres'
    | 'primer_apellido'
    | 'segundo_apellido'
    | 'numerodocumento'
    | 'celular'
    | 'telefono'
    | 'email'
  > | null;
  mandanteNombre?: string | null;
  acuerdoVigente?: Pick<
    Acuerdo,
    | 'baseNegociable'
    | 'montoDescuento'
    | 'montoAcordado'
    | 'montoCuota'
    | 'pagoMinimo'
    | 'porcentajeDesc'
    | 'numeroCuotas'
    | 'dispensarInteresMoratorio'
    | 'dispensarGestionCobranza'
  > | null;
  /** Fecha límite promocional (ej. fin de feria de descuentos). */
  fechaLimite?: string | null;
  /** Porcentaje de descuento para simulación si no hay acuerdo. */
  porcentajeDescSimulado?: number;
  numeroCuotasSimulado?: number;
};

function formatFecha(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  return new Date(iso).toLocaleDateString('es-NI');
}

export function buildPlantillaContextFromPrestamo(
  prestamo: Prestamo,
  acuerdoVigente?: Acuerdo | null,
): PlantillaMensajeContext {
  return {
    prestamo: {
      noPrestamo: prestamo.noPrestamo,
      saldoTotal: prestamo.saldoTotal,
      diasMora: prestamo.diasMora,
      interesMoratorio: prestamo.interesMoratorio,
      gestionCobranza: prestamo.gestionCobranza ?? 0,
      moneda: prestamo.moneda,
      fechaVencimiento: prestamo.fechaVencimiento,
    },
    cliente: prestamo.cliente ?? null,
    mandanteNombre: prestamo.mandante?.nombre ?? null,
    acuerdoVigente: acuerdoVigente ?? null,
  };
}

function formatNombreCliente(
  cliente: PlantillaMensajeContext['cliente'],
): string {
  if (!cliente) {
    return '';
  }
  return [
    cliente.primer_nombres,
    cliente.segundo_nombres,
    cliente.primer_apellido,
    cliente.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ');
}

export function construirVariablesPlantilla(
  ctx: PlantillaMensajeContext,
): Record<string, string> {
  const { prestamo, cliente, mandanteNombre, acuerdoVigente } = ctx;
  const moneda = prestamo.moneda ?? 'NIO';

  const simAcuerdo = acuerdoVigente
    ? {
        baseNegociable: acuerdoVigente.baseNegociable,
        montoDescuento: acuerdoVigente.montoDescuento,
        montoAcordado: acuerdoVigente.montoAcordado,
        montoCuota: acuerdoVigente.montoCuota,
        pagoMinimo: acuerdoVigente.pagoMinimo ?? acuerdoVigente.montoCuota / 2,
      }
    : simularAcuerdo({
        saldoTotal: prestamo.saldoTotal,
        interesMoratorio: prestamo.interesMoratorio,
        gestionCobranza: prestamo.gestionCobranza ?? 0,
        porcentajeDesc: ctx.porcentajeDescSimulado ?? 10,
        numeroCuotas: ctx.numeroCuotasSimulado ?? 1,
      });

  const nombre = formatNombreCliente(cliente);
  const telefono = cliente?.celular ?? cliente?.telefono ?? '';
  const email = cliente?.email ?? '';
  const mandante = mandanteNombre ?? '';
  const mandanteLegal = mandante.toUpperCase().includes('CREDICOMPRAS')
    ? 'TICTAC S.A.'
    : mandante || 'TICTAC S.A.';

  return {
    nombre,
    prestamo: prestamo.noPrestamo,
    documento: cliente?.numerodocumento ?? '',
    saldo: formatearMoneda(prestamo.saldoTotal, moneda),
    saldoTotal: formatearMoneda(prestamo.saldoTotal, moneda),
    diasMora: String(prestamo.diasMora),
    interesMoratorio: formatearMoneda(prestamo.interesMoratorio, moneda),
    baseNegociable: formatearMoneda(simAcuerdo.baseNegociable, moneda),
    montoAcordado: formatearMoneda(simAcuerdo.montoAcordado, moneda),
    montoDescuento: formatearMoneda(simAcuerdo.montoDescuento, moneda),
    montoCuota: formatearMoneda(simAcuerdo.montoCuota, moneda),
    pagoMinimo: formatearMoneda(simAcuerdo.pagoMinimo, moneda),
    telefono,
    celular: telefono,
    email,
    mandante,
    mandanteLegal,
    moneda,
    fechaVencimiento: formatFecha(prestamo.fechaVencimiento),
    fechaLimite:
      ctx.fechaLimite ??
      new Date(Date.now() + 15 * 86_400_000).toLocaleDateString('es-NI'),
  };
}

export function aplicarVariablesPlantilla(
  contenido: string,
  vars: Record<string, string>,
): string {
  return contenido.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

export function normalizarTelefonoWhatsApp(telefono: string): string {
  const digits = telefono.replace(/\D/g, '');
  if (digits.length === 8) {
    return `505${digits}`;
  }
  return digits;
}

export function enlaceWhatsApp(telefono: string, mensaje: string): string {
  const numero = normalizarTelefonoWhatsApp(telefono);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export function enlaceSms(telefono: string, mensaje: string): string {
  const numero = normalizarTelefonoWhatsApp(telefono);
  return `sms:${numero}?body=${encodeURIComponent(mensaje)}`;
}

export function construirAsuntoCobroPlantilla(
  plantillaNombre: string | undefined,
  noPrestamo: string | undefined,
): string {
  if (plantillaNombre?.trim()) {
    return plantillaNombre.trim();
  }
  if (noPrestamo?.trim()) {
    return `Gestión de cobro - Préstamo ${noPrestamo.trim()}`;
  }
  return 'Gestión de cobro';
}
