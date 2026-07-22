/**
 * Aplicación de pagos al plan de cuotas del préstamo (H11).
 */

import { roundMoney } from '@/lib/cobranza/decimal-utils';

export interface CuotaPrestamoParaAbono {
  idcuota: number;
  numero: number;
  saldo: number;
  estado: string;
}

export interface AbonoCuotaPrestamo {
  idcuota: number;
  montoAplicado: number;
  saldoNuevo: number;
  estadoNuevo: 'PENDIENTE' | 'PAGADA' | 'VENCIDA';
}

const TOLERANCIA = 0.009;

/**
 * FIFO por número de cuota: reduce saldo de PENDIENTE/VENCIDA.
 */
export function calcularAbonoPlanCuotas(
  cuotas: CuotaPrestamoParaAbono[],
  montoPago: number,
): AbonoCuotaPrestamo[] {
  let restante = roundMoney(Math.max(0, montoPago));
  const ordenadas = [...cuotas]
    .filter((c) => c.estado === 'PENDIENTE' || c.estado === 'VENCIDA')
    .sort((a, b) => a.numero - b.numero);

  const abonos: AbonoCuotaPrestamo[] = [];

  for (const cuota of ordenadas) {
    if (restante <= TOLERANCIA) {
      break;
    }
    const saldo = roundMoney(Math.max(0, cuota.saldo));
    if (saldo <= TOLERANCIA) {
      continue;
    }
    const toma = roundMoney(Math.min(saldo, restante));
    const saldoNuevo = roundMoney(saldo - toma);
    const estadoNuevo: AbonoCuotaPrestamo['estadoNuevo'] =
      saldoNuevo <= TOLERANCIA
        ? 'PAGADA'
        : cuota.estado === 'VENCIDA'
          ? 'VENCIDA'
          : 'PENDIENTE';

    abonos.push({
      idcuota: cuota.idcuota,
      montoAplicado: toma,
      saldoNuevo: saldoNuevo <= TOLERANCIA ? 0 : saldoNuevo,
      estadoNuevo,
    });
    restante = roundMoney(restante - toma);
  }

  return abonos;
}

export function revertirAbonosPlanCuotas(params: {
  saldoActual: number;
  montoRevertir: number;
  montoCuota: number;
  estadoActual: string;
}): { saldoNuevo: number; estadoNuevo: string } {
  const saldoNuevo = roundMoney(
    Math.min(
      params.montoCuota,
      params.saldoActual + params.montoRevertir,
    ),
  );
  let estadoNuevo = params.estadoActual;
  if (params.estadoActual === 'PAGADA' && saldoNuevo > TOLERANCIA) {
    estadoNuevo = 'PENDIENTE';
  }
  return { saldoNuevo, estadoNuevo };
}
