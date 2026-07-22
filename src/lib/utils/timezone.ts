/**
 * Zona horaria de negocio FlowPay (Centroamérica / Nicaragua).
 * Vercel corre en UTC; nunca usar getHours()/setHours() del runtime.
 */

export const TZ_NEGOCIO = 'America/Managua' as const;

export type PartesZona = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/**
 * Componentes de calendario/hora en la zona indicada.
 */
export function partesEnZona(
  fecha: Date,
  timeZone: string = TZ_NEGOCIO,
): PartesZona {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(fecha)) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  let hour = Number(map.hour);
  if (hour === 24) {
    hour = 0;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/**
 * Convierte hora de pared (en `timeZone`) a Instant UTC.
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string = TZ_NEGOCIO,
): Date {
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let instant = desiredAsUtc;

  for (let i = 0; i < 3; i += 1) {
    const parts = partesEnZona(new Date(instant), timeZone);
    const foundAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    instant -= foundAsUtc - desiredAsUtc;
  }

  return new Date(instant);
}

/** Minutos desde 00:00 en la zona (0–1439). */
export function minutosDelDiaEnZona(
  fecha: Date,
  timeZone: string = TZ_NEGOCIO,
): number {
  const p = partesEnZona(fecha, timeZone);
  return p.hour * 60 + p.minute;
}

/**
 * Día ISO: 1=lunes … 7=domingo (tbl_horario_cobranza).
 */
export function diaSemanaIsoEnZona(
  fecha: Date,
  timeZone: string = TZ_NEGOCIO,
): number {
  const p = partesEnZona(fecha, timeZone);
  const wd = new Date(Date.UTC(p.year, p.month - 1, p.day, 12)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

/** Inicio (00:00) del día calendario en la zona, como Instant UTC. */
export function inicioDiaEnZona(
  fecha: Date = new Date(),
  timeZone: string = TZ_NEGOCIO,
): Date {
  const p = partesEnZona(fecha, timeZone);
  return zonedWallTimeToUtc(p.year, p.month, p.day, 0, 0, 0, timeZone);
}

/** Inicio del día calendario siguiente en la zona. */
export function finDiaEnZona(
  fecha: Date = new Date(),
  timeZone: string = TZ_NEGOCIO,
): Date {
  const p = partesEnZona(fecha, timeZone);
  const next = new Date(Date.UTC(p.year, p.month - 1, p.day + 1, 12));
  return inicioDiaEnZona(next, timeZone);
}

/**
 * Interpreta YYYY-MM-DD (o ISO) como inicio de ese día en zona de negocio.
 */
export function parseFechaCalendarioNegocio(
  valor: string,
  timeZone: string = TZ_NEGOCIO,
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor.trim());
  if (match) {
    return zonedWallTimeToUtc(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      0,
      0,
      0,
      timeZone,
    );
  }

  const parsed = new Date(valor);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return inicioDiaEnZona(parsed, timeZone);
}

/** Formato fecha/hora para UI en zona de negocio. */
export function formatFechaHoraNegocio(
  fecha: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleString('es-NI', {
    timeZone: TZ_NEGOCIO,
    ...options,
  });
}

/** Solo fecha calendario en zona de negocio. */
export function formatFechaNegocio(fecha: Date | string): string {
  return formatFechaHoraNegocio(fecha, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
