/**
 * Política de importación de saldo (H10): corte vs sobrescritura en vivo.
 */

export function debePreservarSaldoVivo(params: {
  cantidadPagosAplicados: number;
}): boolean {
  return params.cantidadPagosAplicados > 0;
}

/**
 * Normaliza estado de archivo a catálogo conocido; null si inválido.
 */
export function normalizarEstadoImportacion(
  estadoRaw: string | null | undefined,
): string | null {
  if (!estadoRaw?.trim()) {
    return null;
  }
  const t = estadoRaw.trim();
  const mapa: Record<string, string> = {
    vigente: 'Vigente',
    vencido: 'Vencido',
    'en negociacion': 'En negociación',
    'en negociación': 'En negociación',
    'con acuerdo': 'Con acuerdo',
    'pendiente revision': 'Pendiente revisión',
    'pendiente revisión': 'Pendiente revisión',
    castigo: 'Castigo',
    cancelado: 'Cancelado',
    finalizado: 'Finalizado',
  };
  const key = t.toLowerCase();
  if (mapa[key]) {
    return mapa[key];
  }
  const canonicos = Object.values(mapa);
  if (canonicos.includes(t)) {
    return t;
  }
  return null;
}
