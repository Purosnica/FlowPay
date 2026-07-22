/**
 * Serialización de filtros de bandeja ↔ URL search params.
 */

import type { BandejaFilters } from '@/types/cobranza';
import { obtenerPresetBandejaPorId } from '@/lib/cobranza/bandeja-presets';

export function filtrosBandejaDesdeSearchParams(
  searchParams: URLSearchParams,
): BandejaFilters {
  const presetId = searchParams.get('preset');
  if (presetId) {
    const preset = obtenerPresetBandejaPorId(presetId);
    if (preset) {
      return { ...preset.filters };
    }
  }

  const filters: BandejaFilters = {};
  const idmandante = searchParams.get('idmandante');
  if (idmandante) {
    const n = Number(idmandante);
    if (Number.isFinite(n) && n > 0) {
      filters.idmandante = n;
    }
  }
  if (searchParams.get('soloPromesaVencida') === '1') {
    filters.soloPromesaVencida = true;
  }
  if (searchParams.get('soloSinGestion') === '1') {
    filters.soloSinGestion = true;
  }
  if (searchParams.get('soloAgendaHoy') === '1') {
    filters.soloAgendaHoy = true;
  }
  const tramoMin = searchParams.get('tramoMoraMin');
  if (tramoMin != null && tramoMin !== '') {
    const n = Number(tramoMin);
    if (Number.isFinite(n)) {
      filters.tramoMoraMin = n;
    }
  }
  const tramoMax = searchParams.get('tramoMoraMax');
  if (tramoMax != null && tramoMax !== '') {
    const n = Number(tramoMax);
    if (Number.isFinite(n)) {
      filters.tramoMoraMax = n;
    }
  }
  const ordenarPor = searchParams.get('ordenarPor');
  if (
    ordenarPor === 'saldo_desc' ||
    ordenarPor === 'saldo_asc' ||
    ordenarPor === 'prioridad'
  ) {
    filters.ordenarPor =
      ordenarPor === 'prioridad' ? undefined : ordenarPor;
  }
  const search = searchParams.get('search');
  if (search?.trim()) {
    filters.search = search.trim();
  }
  return filters;
}

export function searchParamsDesdeFiltrosBandeja(
  filters: BandejaFilters,
  searchInput?: string,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.idmandante) {
    params.set('idmandante', String(filters.idmandante));
  }
  if (filters.soloPromesaVencida) {
    params.set('soloPromesaVencida', '1');
  }
  if (filters.soloSinGestion) {
    params.set('soloSinGestion', '1');
  }
  if (filters.soloAgendaHoy) {
    params.set('soloAgendaHoy', '1');
  }
  if (filters.tramoMoraMin !== undefined) {
    params.set('tramoMoraMin', String(filters.tramoMoraMin));
  }
  if (filters.tramoMoraMax != null) {
    params.set('tramoMoraMax', String(filters.tramoMoraMax));
  }
  if (filters.ordenarPor) {
    params.set('ordenarPor', filters.ordenarPor);
  }
  const q = searchInput?.trim() || filters.search?.trim();
  if (q) {
    params.set('search', q);
  }
  return params;
}
