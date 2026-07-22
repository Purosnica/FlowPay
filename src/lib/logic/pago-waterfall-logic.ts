/**
 * Waterfall de aplicación de pagos sobre componentes del saldo.
 * Orden: cargos/gestión → interés → capital (montoPrestamo).
 * interesMoratorio no forma parte de saldoTotal (CREDICOMPRAS).
 */

import { roundMoney } from '@/lib/cobranza/decimal-utils';

export const ORDEN_WATERFALL_SALDO = [
  'gestionCobranza',
  'cargosAdmin',
  'comisionCav',
  'comisionInsitu',
  'seguroSvsd',
  'mantenimientoValor',
  'interes',
  'montoPrestamo',
] as const;

export type ComponenteWaterfall = (typeof ORDEN_WATERFALL_SALDO)[number];

export type ComponentesSaldoWaterfall = Record<ComponenteWaterfall, number>;

export type AsignacionWaterfall = Partial<
  Record<ComponenteWaterfall, number>
>;

export function componentesDesdePrestamo(row: {
  gestionCobranza: number;
  cargosAdmin: number;
  comisionCav: number;
  comisionInsitu: number;
  seguroSvsd: number;
  mantenimientoValor: number;
  interes: number;
  montoPrestamo: number;
}): ComponentesSaldoWaterfall {
  return {
    gestionCobranza: roundMoney(row.gestionCobranza),
    cargosAdmin: roundMoney(row.cargosAdmin),
    comisionCav: roundMoney(row.comisionCav),
    comisionInsitu: roundMoney(row.comisionInsitu),
    seguroSvsd: roundMoney(row.seguroSvsd),
    mantenimientoValor: roundMoney(row.mantenimientoValor),
    interes: roundMoney(row.interes),
    montoPrestamo: roundMoney(row.montoPrestamo),
  };
}

/**
 * Distribuye `monto` restando de cada componente en orden.
 * Si los componentes suman menos que el monto (datos descuadrados),
 * el remanente se asume absorbido solo en saldoTotal.
 */
export function calcularWaterfallAplicacion(
  componentes: ComponentesSaldoWaterfall,
  monto: number,
): {
  asignacion: AsignacionWaterfall;
  componentesNuevos: ComponentesSaldoWaterfall;
  montoAplicadoAComponentes: number;
} {
  let restante = roundMoney(monto);
  const asignacion: AsignacionWaterfall = {};
  const componentesNuevos = { ...componentes };

  for (const key of ORDEN_WATERFALL_SALDO) {
    if (restante <= 0) {
      break;
    }
    const disponible = Math.max(0, componentesNuevos[key]);
    if (disponible <= 0) {
      continue;
    }
    const toma = roundMoney(Math.min(disponible, restante));
    if (toma <= 0) {
      continue;
    }
    asignacion[key] = toma;
    componentesNuevos[key] = roundMoney(disponible - toma);
    restante = roundMoney(restante - toma);
  }

  return {
    asignacion,
    componentesNuevos,
    montoAplicadoAComponentes: roundMoney(monto - restante),
  };
}

/** Invierte una asignación guardada (reverso de pago). */
export function aplicarWaterfallReverso(
  componentes: ComponentesSaldoWaterfall,
  asignacion: AsignacionWaterfall,
): ComponentesSaldoWaterfall {
  const next = { ...componentes };
  for (const key of ORDEN_WATERFALL_SALDO) {
    const monto = asignacion[key];
    if (monto == null || monto <= 0) {
      continue;
    }
    next[key] = roundMoney(next[key] + monto);
  }
  return next;
}

export function serializarAsignacionWaterfall(
  asignacion: AsignacionWaterfall,
): string {
  return JSON.stringify(asignacion);
}

export type AbonoCuotaSnapshot = {
  idcuota: number;
  monto: number;
};

export type SnapshotAplicacionPago = {
  componentes: AsignacionWaterfall;
  cuotas?: AbonoCuotaSnapshot[];
};

export function serializarSnapshotAplicacion(
  snapshot: SnapshotAplicacionPago,
): string {
  return JSON.stringify(snapshot);
}

export function parseSnapshotAplicacion(
  raw: string | null | undefined,
): SnapshotAplicacionPago | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const obj = parsed as Record<string, unknown>;

    // Formato nuevo: { componentes, cuotas }
    if (
      obj.componentes &&
      typeof obj.componentes === 'object' &&
      !Array.isArray(obj.componentes)
    ) {
      const componentes = parseAsignacionWaterfall(
        JSON.stringify(obj.componentes),
      ) ?? {};
      const cuotas: AbonoCuotaSnapshot[] = [];
      if (Array.isArray(obj.cuotas)) {
        for (const item of obj.cuotas) {
          if (
            item &&
            typeof item === 'object' &&
            typeof (item as { idcuota?: unknown }).idcuota === 'number' &&
            typeof (item as { monto?: unknown }).monto === 'number'
          ) {
            const row = item as { idcuota: number; monto: number };
            if (row.monto > 0) {
              cuotas.push({
                idcuota: row.idcuota,
                monto: roundMoney(row.monto),
              });
            }
          }
        }
      }
      return {
        componentes,
        cuotas: cuotas.length > 0 ? cuotas : undefined,
      };
    }

    // Formato legacy: solo componentes en raíz
    const componentes = parseAsignacionWaterfall(raw);
    if (!componentes) {
      return null;
    }
    return { componentes };
  } catch {
    return null;
  }
}

export function parseAsignacionWaterfall(
  raw: string | null | undefined,
): AsignacionWaterfall | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    // Si viene envuelto, no usar como componentes planos
    if ('componentes' in (parsed as object)) {
      const snap = parseSnapshotAplicacion(raw);
      return snap?.componentes ?? null;
    }
    const out: AsignacionWaterfall = {};
    for (const key of ORDEN_WATERFALL_SALDO) {
      const val = (parsed as Record<string, unknown>)[key];
      if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
        out[key] = roundMoney(val);
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}
