/**
 * Lógica pura para el panel "Qué hacer ahora" del cobrador.
 *
 * Deriva acciones concretas y priorizadas a partir del resumen operativo
 * (`MiDiaResumen`), evitando saturar el dashboard con KPIs sin contexto.
 */

import type { MiDiaResumen } from '@/types/cobranza';

export type PrioridadAccion = 'urgente' | 'alta' | 'normal';

export interface AccionSugerida {
  id: string;
  titulo: string;
  descripcion: string;
  cantidad: number;
  prioridad: PrioridadAccion;
  href: string;
  ctaLabel: string;
}

const ORDEN_PRIORIDAD: Record<PrioridadAccion, number> = {
  urgente: 0,
  alta: 1,
  normal: 2,
};

/**
 * Construye la lista de acciones sugeridas para el cobrador, ordenada por
 * prioridad y cantidad. Solo devuelve acciones con casos pendientes.
 */
export function construirAccionesCobrador(
  miDia: MiDiaResumen,
): AccionSugerida[] {
  const candidatas: AccionSugerida[] = [
    {
      id: 'promesas-vencidas',
      titulo: 'Recuperar promesas vencidas',
      descripcion:
        'Deudores que incumplieron su promesa de pago. Contáctalos y renegocia.',
      cantidad: miDia.promesasVencidas,
      prioridad: 'urgente',
      href: '/cobranza/bandeja?soloPromesaVencida=1',
      ctaLabel: 'Gestionar ahora',
    },
    {
      id: 'promesas-hoy',
      titulo: 'Confirmar promesas de hoy',
      descripcion:
        'Promesas de pago que vencen hoy. Da seguimiento para asegurar el cobro.',
      cantidad: miDia.promesasHoy,
      prioridad: 'alta',
      href: '/cobranza/mi-dia',
      ctaLabel: 'Ver promesas',
    },
    {
      id: 'agenda-hoy',
      titulo: 'Atender agenda del día',
      descripcion: 'Gestiones que programaste para hoy con próxima acción.',
      cantidad: miDia.agendaHoy,
      prioridad: 'alta',
      href: '/cobranza/bandeja?soloAgendaHoy=1',
      ctaLabel: 'Abrir agenda',
    },
    {
      id: 'casos-prioritarios',
      titulo: 'Trabajar cola priorizada',
      descripcion:
        'Casos de mayor prioridad en tu bandeja según mora y score.',
      cantidad: miDia.casosPrioritarios,
      prioridad: 'normal',
      href: '/cobranza/bandeja?preset=inbox_operativo',
      ctaLabel: 'Abrir bandeja',
    },
  ];

  return candidatas
    .filter((accion) => accion.cantidad > 0)
    .sort((a, b) => {
      const porPrioridad =
        ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad];
      if (porPrioridad !== 0) {
        return porPrioridad;
      }
      return b.cantidad - a.cantidad;
    });
}
