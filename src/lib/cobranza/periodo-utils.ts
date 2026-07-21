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

/**
 * Etiqueta YYYY-MM del mes calendario local (negocio).
 * El rango de fechas se obtiene con `parsePeriodo` → límites UTC.
 */
export function periodoActual(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Rango half-open [inicio, fin) del mes actual de negocio. */
export function rangoPeriodoActual(): RangoPeriodo {
  return parsePeriodo(periodoActual());
}

/**
 * Mes relativo al actual: 0 = actual, -1 = anterior, 1 = siguiente.
 */
export function rangoMesRelativo(offsetMeses: number): RangoPeriodo {
  const actual = rangoPeriodoActual();
  const ancla = new Date(
    Date.UTC(
      actual.inicio.getUTCFullYear(),
      actual.inicio.getUTCMonth() + offsetMeses,
      1,
    ),
  );
  const periodo = `${ancla.getUTCFullYear()}-${String(ancla.getUTCMonth() + 1).padStart(2, '0')}`;
  return parsePeriodo(periodo);
}

/** Filtro Prisma half-open para DateTime de negocio. */
export function filtroFechaEnPeriodo(
  rango: Pick<RangoPeriodo, 'inicio' | 'fin'>,
): { gte: Date; lt: Date } {
  return { gte: rango.inicio, lt: rango.fin };
}

/**
 * Mes actual hasta ahora (MTD), sin salir del periodo.
 * Preferible a `lte: new Date()` local para no omitir el día 1.
 */
export function filtroFechaMesActualHastaAhora(): { gte: Date; lt: Date } {
  const { inicio, fin } = rangoPeriodoActual();
  const ahora = new Date();
  return { gte: inicio, lt: ahora < fin ? ahora : fin };
}

/** Inicio UTC del mes actual (para `gte` en KPIs / dashboards). */
export function inicioPeriodoActual(): Date {
  return rangoPeriodoActual().inicio;
}
