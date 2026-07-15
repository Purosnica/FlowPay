import { roundMoney } from '@/lib/cobranza/decimal-utils';
import { valorNumero } from './cartera-parse-helpers';
import type { FilaCarteraParseada } from './types';

export interface DatosFinancierosCartera {
  saldoTotal: number;
  montoPrestamo: number;
  interes: number;
  interesMoratorio: number;
  comisionCav: number;
  comisionInsitu: number;
  mantenimientoValor: number;
  gestionCobranza: number;
  seguroSvsd: number;
  cargosAdmin: number;
  devolucionSaldoFavor: number;
  descuentosArchivo: number;
  totalPagosArchivo: number;
}

/**
 * Extrae datos financieros de la fila y reconcilia montoPrestamo
 * para que el desglose siempre cuadre con saldoTotal.
 *
 * Cuando el archivo no trae todas las columnas de componentes,
 * la diferencia se absorbe en montoPrestamo (capital residual).
 */
export function extraerDatosFinancierosCartera(
  fila: FilaCarteraParseada,
): DatosFinancierosCartera {
  const saldoTotal = valorNumero(fila.valores.saldoTotal);
  let montoPrestamo = valorNumero(fila.valores.montoPrestamo);
  const interes = valorNumero(fila.valores.interes);
  const interesMoratorio = valorNumero(fila.valores.interesMoratorio);
  const comisionCav = valorNumero(fila.valores.comisionCav);
  const comisionInsitu = valorNumero(fila.valores.comisionInsitu);
  const mantenimientoValor = valorNumero(fila.valores.mantenimientoValor);
  const gestionCobranza = valorNumero(fila.valores.gestionCobranza);
  const seguroSvsd = valorNumero(fila.valores.seguroSvsd);
  const cargosAdmin = valorNumero(fila.valores.cargosAdmin);
  const devolucionSaldoFavor = valorNumero(fila.valores.devolucionSaldoFavor);
  const descuentosArchivo = valorNumero(fila.valores.descuentosArchivo);
  const totalPagosArchivo = valorNumero(fila.valores.totalPagosArchivo);

  const subtotalSinCapital = roundMoney(
    interes +
      gestionCobranza +
      comisionCav +
      comisionInsitu +
      mantenimientoValor +
      seguroSvsd +
      cargosAdmin -
      devolucionSaldoFavor -
      descuentosArchivo,
  );

  const saldoCalculado = roundMoney(
    Math.max(0, montoPrestamo + subtotalSinCapital - totalPagosArchivo),
  );

  if (saldoTotal > 0 && Math.abs(saldoTotal - saldoCalculado) > 0.01) {
    montoPrestamo = roundMoney(
      saldoTotal + totalPagosArchivo - subtotalSinCapital,
    );
    if (montoPrestamo < 0) {
      montoPrestamo = saldoTotal;
    }
  }

  return {
    saldoTotal,
    montoPrestamo,
    interes,
    interesMoratorio,
    comisionCav,
    comisionInsitu,
    mantenimientoValor,
    gestionCobranza,
    seguroSvsd,
    cargosAdmin,
    devolucionSaldoFavor,
    descuentosArchivo,
    totalPagosArchivo,
  };
}
