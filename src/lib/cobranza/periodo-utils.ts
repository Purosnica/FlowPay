/**
 * Utilidades para periodos de liquidación (formato YYYY-MM).
 */

export interface RangoPeriodo {
  periodo: string;
  inicio: Date;
  fin: Date;
}

export function parsePeriodo(periodo: string): RangoPeriodo {
  const match = /^(\d{4})-(\d{2})$/.exec(periodo.trim());
  if (!match) {
    throw new Error('Periodo inválido. Use formato YYYY-MM (ej. 2026-03).');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error('Mes inválido en el periodo.');
  }
  const inicio = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const fin = new Date(year, month, 1, 0, 0, 0, 0);
  return { periodo: `${year}-${String(month).padStart(2, '0')}`, inicio, fin };
}

export function periodoActual(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
