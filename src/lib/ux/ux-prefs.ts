/**
 * Preferencias UX locales del cobrador (I180, I183, I187).
 * gamificacionQuiet default true (I187: sin vanity en flujo operativo).
 */

export const UX_PREF_KEYS = {
  focoMiDia: 'flowpay_ux_foco_mi_dia',
  gamificacionQuiet: 'flowpay_ux_gamif_quiet',
  reporteColumnas: 'flowpay_ux_reporte_cols',
  tourCentroInteligencia: 'flowpay_ux_tour_ci',
} as const;

export function leerBoolPref(key: string, fallback = false): boolean {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return raw === '1' || raw === 'true';
  } catch {
    return fallback;
  }
}

export function escribirBoolPref(key: string, value: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(key, value ? '1' : '0');
}

export function claveReporteColumnas(
  idusuario: number,
  reporteId: string,
): string {
  return `${UX_PREF_KEYS.reporteColumnas}.${idusuario}.${reporteId}`;
}

export function leerColumnasVisibles(
  idusuario: number,
  reporteId: string,
): string[] | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(
      claveReporteColumnas(idusuario, reporteId),
    );
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function guardarColumnasVisibles(
  idusuario: number,
  reporteId: string,
  columnIds: string[],
): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(
    claveReporteColumnas(idusuario, reporteId),
    JSON.stringify(columnIds),
  );
}
