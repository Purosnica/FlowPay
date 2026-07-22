/**
 * Lógica de contacto en lote para agenda de secuencia (Mi día).
 * Reutiliza plantillas + deep links WA/SMS y API email de cobro.
 */

import {
  aplicarVariablesPlantilla,
  construirAsuntoCobroPlantilla,
  construirVariablesPlantilla,
  enlaceSms,
  enlaceWhatsApp,
  type PlantillaMensajeContext,
} from '@/lib/cobranza/plantilla-mensaje-utils';
import type { AgendaSecuenciaItem } from '@/types/cobranza';

export type CanalSecuencia = 'WHATSAPP' | 'SMS' | 'EMAIL' | string;

export function claveAgendaItem(item: AgendaSecuenciaItem): string {
  return `${item.idprestamo}-${item.idpaso}`;
}

export function buildContextDesdeAgenda(
  item: AgendaSecuenciaItem,
): PlantillaMensajeContext {
  return {
    prestamo: {
      noPrestamo: item.noPrestamo,
      saldoTotal: item.saldoTotal,
      diasMora: item.diasMora,
      interesMoratorio: item.interesMoratorio,
      gestionCobranza: item.gestionCobranza,
      moneda: item.moneda,
      fechaVencimiento: null,
    },
    cliente: {
      primer_nombres: item.nombreCliente,
      segundo_nombres: null,
      primer_apellido: '',
      segundo_apellido: null,
      numerodocumento: '',
      celular: item.telefono,
      telefono: item.telefono,
      email: item.email,
    },
    mandanteNombre: item.mandanteNombre,
  };
}

export function resolverMensajeAgenda(item: AgendaSecuenciaItem): string {
  const contenido = item.plantillaContenido?.trim() || '';
  if (!contenido) {
    return (
      item.accion?.trim() ||
      `Contacto secuencia — préstamo ${item.noPrestamo}`
    );
  }
  const vars = construirVariablesPlantilla(buildContextDesdeAgenda(item));
  return aplicarVariablesPlantilla(contenido, vars);
}

export type AccionContactoAgenda =
  | { tipo: 'whatsapp' | 'sms'; url: string }
  | { tipo: 'email'; to: string; subject: string; body: string }
  | { tipo: 'omitido'; motivo: string };

export function resolverAccionContacto(
  item: AgendaSecuenciaItem,
): AccionContactoAgenda {
  const canal = item.canal.trim().toUpperCase();
  const mensaje = resolverMensajeAgenda(item);

  if (canal === 'WHATSAPP') {
    if (!item.telefono) {
      return { tipo: 'omitido', motivo: 'Sin teléfono' };
    }
    return {
      tipo: 'whatsapp',
      url: enlaceWhatsApp(item.telefono, mensaje),
    };
  }

  if (canal === 'SMS') {
    if (!item.telefono) {
      return { tipo: 'omitido', motivo: 'Sin teléfono' };
    }
    return { tipo: 'sms', url: enlaceSms(item.telefono, mensaje) };
  }

  if (canal === 'EMAIL') {
    if (!item.email) {
      return { tipo: 'omitido', motivo: 'Sin email' };
    }
    return {
      tipo: 'email',
      to: item.email,
      subject: construirAsuntoCobroPlantilla(
        item.plantillaNombre ?? undefined,
        item.noPrestamo,
      ),
      body: mensaje,
    };
  }

  if (item.telefono) {
    return {
      tipo: 'whatsapp',
      url: enlaceWhatsApp(item.telefono, mensaje),
    };
  }

  return {
    tipo: 'omitido',
    motivo: `Canal ${item.canal} sin datos de contacto`,
  };
}

export function construirNotaGestionSecuencia(
  item: AgendaSecuenciaItem,
): string {
  const snippet = resolverMensajeAgenda(item).slice(0, 120);
  return `Secuencia paso #${item.idpaso} — ${item.canal}: ${snippet}`;
}

export function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Índice del siguiente ítem accionable (no omitido) desde `fromIndex` inclusive.
 */
export function siguienteIndiceAccionable(
  items: readonly AgendaSecuenciaItem[],
  fromIndex: number,
): number | null {
  for (let i = Math.max(0, fromIndex); i < items.length; i += 1) {
    const item = items[i];
    if (!item) {
      continue;
    }
    if (resolverAccionContacto(item).tipo !== 'omitido') {
      return i;
    }
  }
  return null;
}

export function etiquetaCanalAccion(accion: AccionContactoAgenda): string {
  if (accion.tipo === 'whatsapp') {
    return 'WhatsApp';
  }
  if (accion.tipo === 'sms') {
    return 'SMS';
  }
  if (accion.tipo === 'email') {
    return 'Email';
  }
  return 'Omitido';
}
