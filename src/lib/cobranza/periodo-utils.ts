/**
 * Utilidades para periodos de liquidación (formato YYYY-MM).
 *
 * Los rangos usan UTC a propósito: Prisma/MySQL tratan `DateTime` sin TZ
 * como UTC. Si el inicio del mes se arma en hora local (p. ej. Managua
 * UTC-6), un pago del día 1 a `00:00:00` queda fuera del periodo y en el
 * mes anterior (desfase típico de C$ en liquidaciones).
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
  const inicio = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const fin = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { periodo: `${year}-${String(month).padStart(2, '0')}`, inicio, fin };
}

export function periodoActual(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
