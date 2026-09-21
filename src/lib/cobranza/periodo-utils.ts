import { partesEnZona } from '@/lib/utils/timezone';

/**
 * Utilidades para periodos mensuales y rangos inclusivos de fechas.
 *
 * Los límites usan UTC a propósito: Prisma/MySQL tratan `DateTime` sin TZ
 * como UTC. El límite final se transforma a exclusivo para incluir el día
 * completo seleccionado sin depender de su hora.
 */

export interface RangoPeriodo {
  periodo: string;
  inicio: Date;
  fin: Date;
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const RANGO_FECHAS_RE = /^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$/;
export const MAX_DIAS_RANGO_REPORTES = 366;
const MS_DIA = 86_400_000;

function parseFechaUtc(value: string, etiqueta: string): Date {
  if (!FECHA_RE.test(value)) {
    throw new Error(`${etiqueta} inválida. Use formato YYYY-MM-DD.`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const fecha = new Date(Date.UTC(year, month - 1, day));
  if (
    fecha.getUTCFullYear() !== year ||
    fecha.getUTCMonth() !== month - 1 ||
    fecha.getUTCDate() !== day
  ) {
    throw new Error(`${etiqueta} inválida.`);
  }
  return fecha;
}

export function parsePeriodo(periodo: string): RangoPeriodo {
  const valor = periodo.trim();
  const rangoMatch = RANGO_FECHAS_RE.exec(valor);
  if (rangoMatch) {
    const inicio = parseFechaUtc(rangoMatch[1], 'Fecha inicial');
    const finInclusivo = parseFechaUtc(rangoMatch[2], 'Fecha final');
    if (inicio > finInclusivo) {
      throw new Error('La fecha inicial no puede ser posterior a la fecha final.');
    }
    const fin = new Date(finInclusivo);
    fin.setUTCDate(fin.getUTCDate() + 1);
    if ((fin.getTime() - inicio.getTime()) / MS_DIA > MAX_DIAS_RANGO_REPORTES) {
      throw new Error(`El rango no puede superar ${MAX_DIAS_RANGO_REPORTES} días.`);
    }
    return { periodo: `${rangoMatch[1]}/${rangoMatch[2]}`, inicio, fin };
  }

  const match = /^(\d{4})-(\d{2})$/.exec(valor);
  if (!match) {
    throw new Error('Rango inválido. Use YYYY-MM-DD/YYYY-MM-DD (ej. 2026-03-01/2026-03-31).');
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

/** Cantidad de días calendario de un rango half-open. */
export function diasEnRango(rango: Pick<RangoPeriodo, 'inicio' | 'fin'>): number {
  return Math.max(0, Math.round((rango.fin.getTime() - rango.inicio.getTime()) / MS_DIA));
}

/**
 * Equivalencia del rango en meses calendario. Un mes completo vale 1 y los
 * meses parciales se prorratean por sus días reales (28–31).
 */
export function factorMesesEnRango(rango: Pick<RangoPeriodo, 'inicio' | 'fin'>): number {
  let cursor = new Date(rango.inicio);
  let factor = 0;
  while (cursor < rango.fin) {
    const inicioMes = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
    const finMes = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const tramoInicio = cursor > inicioMes ? cursor : inicioMes;
    const tramoFin = rango.fin < finMes ? rango.fin : finMes;
    factor +=
      diasEnRango({ inicio: tramoInicio, fin: tramoFin }) /
      diasEnRango({
        inicio: inicioMes,
        fin: finMes,
      });
    cursor = finMes;
  }
  return factor;
}

/**
 * Periodo inmediatamente posterior. Un mes calendario completo avanza al
 * siguiente mes completo; cualquier otro rango conserva su cantidad de días.
 */
export function rangoSiguienteEquivalente(
  rango: Pick<RangoPeriodo, 'inicio' | 'fin'>
): Pick<RangoPeriodo, 'inicio' | 'fin'> {
  const inicio = new Date(rango.fin);
  const finMesSeleccionado = new Date(
    Date.UTC(rango.inicio.getUTCFullYear(), rango.inicio.getUTCMonth() + 1, 1)
  );
  const esMesCompleto =
    rango.inicio.getUTCDate() === 1 && rango.fin.getTime() === finMesSeleccionado.getTime();

  if (esMesCompleto) {
    return {
      inicio,
      fin: new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1)),
    };
  }

  return {
    inicio,
    fin: new Date(inicio.getTime() + (rango.fin.getTime() - rango.inicio.getTime())),
  };
}

/** Indica si el valor representa un rango inclusivo de fechas válido. */
export function esRangoFechasValido(value: string): boolean {
  try {
    return RANGO_FECHAS_RE.test(value.trim()) && Boolean(parsePeriodo(value));
  } catch {
    return false;
  }
}

/** Rango inclusivo que cubre el mes actual en la zona de negocio. */
export function rangoFechasMesActual(ahora: Date = new Date()): string {
  const hoy = partesEnZona(ahora);
  const year = hoy.year;
  const month = hoy.month - 1;
  const desde = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const ultimoDia = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const hasta = `${year}-${String(month + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  return `${desde}/${hasta}`;
}

/** Inicio UTC de la fecha calendario actual de negocio para campos date-only. */
export function inicioDiaNegocioActualUtc(ahora: Date = new Date()): Date {
  const hoy = partesEnZona(ahora);
  return new Date(Date.UTC(hoy.year, hoy.month - 1, hoy.day, 0, 0, 0, 0));
}

/**
 * Límite exclusivo para consultar un rango hasta el día de negocio actual,
 * incluyendo completo el día de hoy en campos almacenados como fecha UTC.
 */
export function finRangoHastaHoy(
  rango: Pick<RangoPeriodo, 'inicio' | 'fin'>,
  ahora: Date = new Date()
): Date {
  const hoy = inicioDiaNegocioActualUtc(ahora);
  if (hoy < rango.inicio) return new Date(rango.inicio);
  if (hoy >= rango.fin) return new Date(rango.fin);

  const manana = new Date(hoy);
  manana.setUTCDate(manana.getUTCDate() + 1);
  return manana < rango.fin ? manana : new Date(rango.fin);
}

/**
 * Etiqueta YYYY-MM del mes calendario local (negocio).
 * El rango de fechas se obtiene con `parsePeriodo` → límites UTC.
 */
export function periodoActual(ahora: Date = new Date()): string {
  const hoy = partesEnZona(ahora);
  const y = hoy.year;
  const m = String(hoy.month).padStart(2, '0');
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
    Date.UTC(actual.inicio.getUTCFullYear(), actual.inicio.getUTCMonth() + offsetMeses, 1)
  );
  const periodo = `${ancla.getUTCFullYear()}-${String(ancla.getUTCMonth() + 1).padStart(2, '0')}`;
  return parsePeriodo(periodo);
}

/** Filtro Prisma half-open para DateTime de negocio. */
export function filtroFechaEnPeriodo(rango: Pick<RangoPeriodo, 'inicio' | 'fin'>): {
  gte: Date;
  lt: Date;
} {
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
