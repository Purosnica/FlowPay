/**
 * Chips de monto rápido para registro de pago (saldo / mitades).
 */

export type MontoRapidoChip = {
  label: string;
  valor: number;
};

function redondearMonto(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Construye sugerencias de monto a partir del saldo (y opcionalmente cuota).
 */
export function construirMontosRapidos(params: {
  saldoTotal?: number | null;
  montoCuota?: number | null;
  montoPromesa?: number | null;
}): MontoRapidoChip[] {
  const chips: MontoRapidoChip[] = [];
  const saldo = params.saldoTotal;
  const cuota = params.montoCuota;
  const promesa = params.montoPromesa;

  if (cuota != null && cuota > 0) {
    chips.push({ label: 'Cuota', valor: redondearMonto(cuota) });
  }
  if (promesa != null && promesa > 0) {
    chips.push({ label: 'Promesa', valor: redondearMonto(promesa) });
  }
  if (saldo != null && saldo > 0) {
    chips.push({ label: 'Saldo', valor: redondearMonto(saldo) });
    const mitad = redondearMonto(saldo / 2);
    if (mitad > 0 && mitad < saldo) {
      chips.push({ label: '50%', valor: mitad });
    }
  }

  const vistos = new Set<number>();
  return chips.filter((c) => {
    if (vistos.has(c.valor)) {
      return false;
    }
    vistos.add(c.valor);
    return true;
  });
}
