const MAX_DESCRIPCION_COMPACTA = 90;

/**
 * Fecha corta para filas densas del timeline (día/mes + hora).
 */
export function formatearFechaTimeline(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.toLocaleString('es-NI', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Resume descripción/metadata para no inflar la UI.
 * Si es JSON plano, intenta un resumen legible de pares clave→valor.
 */
export function resumirTextoTimeline(
  texto: string | null | undefined,
  maxLen = MAX_DESCRIPCION_COMPACTA,
): string | null {
  if (!texto) {
    return null;
  }
  const trimmed = texto.trim();
  if (!trimmed) {
    return null;
  }

  const desdeJson = resumirJsonTimeline(trimmed);
  const base = desdeJson ?? trimmed;
  if (base.length <= maxLen) {
    return base;
  }
  return `${base.slice(0, maxLen - 1).trimEnd()}…`;
}

function resumirJsonTimeline(texto: string): string | null {
  if (!texto.startsWith('{') && !texto.startsWith('[')) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(texto);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const entries = Object.entries(parsed as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== 'null')
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${String(v)}`);
    if (entries.length === 0) {
      return null;
    }
    return entries.join(' · ');
  } catch {
    return null;
  }
}

export function lineaSecundariaTimeline(
  descripcion: string,
  metadata: string | null,
): string | null {
  const partes = [
    resumirTextoTimeline(descripcion),
    resumirTextoTimeline(metadata, 40),
  ].filter((p): p is string => Boolean(p));
  if (partes.length === 0) {
    return null;
  }
  return partes.join(' · ');
}
