import type { BandejaFilters } from '@/types/cobranza';

export interface BandejaPreset {
  id: string;
  nombre: string;
  filters: BandejaFilters;
  esSistema?: boolean;
}

export const PRESETS_BANDEJA_SISTEMA: BandejaPreset[] = [
  {
    id: 'inbox_operativo',
    nombre: 'Inbox operativo',
    esSistema: true,
    filters: { ordenarPor: 'prioridad', prioridadMin: 50 },
  },
  {
    id: 'prioridad',
    nombre: 'Prioridad inteligente',
    esSistema: true,
    filters: {},
  },
  {
    id: 'promesas_vencidas',
    nombre: 'Promesas vencidas',
    esSistema: true,
    filters: { soloPromesaVencida: true },
  },
  {
    id: 'agenda_hoy',
    nombre: 'Agenda hoy',
    esSistema: true,
    filters: { soloAgendaHoy: true },
  },
  {
    id: 'sin_gestion',
    nombre: 'Sin gestión 7+ días',
    esSistema: true,
    filters: { soloSinGestion: true },
  },
  {
    id: 'saldo_alto',
    nombre: 'Mayor saldo',
    esSistema: true,
    filters: { ordenarPor: 'saldo_desc' },
  },
];

export const STORAGE_KEY_BANDEJA_PRESETS = 'flowpay.bandeja.presets';

export function obtenerPresetBandejaPorId(id: string): BandejaPreset | undefined {
  return PRESETS_BANDEJA_SISTEMA.find((p) => p.id === id);
}

export function presetCoincideConFiltros(
  preset: BandejaPreset,
  filters: BandejaFilters,
): boolean {
  const pf = preset.filters;
  return (
    (pf.idmandante ?? undefined) === (filters.idmandante ?? undefined) &&
    (pf.soloPromesaVencida ?? false) === (filters.soloPromesaVencida ?? false) &&
    (pf.soloAgendaHoy ?? false) === (filters.soloAgendaHoy ?? false) &&
    (pf.soloSinGestion ?? false) === (filters.soloSinGestion ?? false) &&
    (pf.tramoMoraMin ?? undefined) === (filters.tramoMoraMin ?? undefined) &&
    (pf.tramoMoraMax ?? undefined) === (filters.tramoMoraMax ?? undefined) &&
    (pf.prioridadMin ?? undefined) === (filters.prioridadMin ?? undefined) &&
    (pf.ordenarPor ?? 'prioridad') === (filters.ordenarPor ?? 'prioridad')
  );
}
