import { roundMoney } from './decimal-utils';

/** Tolerancia para considerar que saldo calculado y registrado coinciden. */
export const TOLERANCIA_SALDO_CUADRE = 0.01;

export interface ComponentesSaldoCredicompras {
  montoPrestamo: number;
  interes: number;
  gestionCobranza: number;
  comisionCav: number;
  comisionInsitu: number;
  mantenimientoValor: number;
  seguroSvsd: number;
  cargosAdmin: number;
  devolucionSaldoFavor?: number;
  descuentosArchivo?: number;
}

export interface DesgloseSaldoPrestamo {
  montoPrestamo: number;
  interes: number;
  gestionCobranza: number;
  comisionCav: number;
  comisionInsitu: number;
  mantenimientoValor: number;
  seguroSvsd: number;
  cargosAdmin: number;
  devolucionSaldoFavor: number;
  descuentosArchivo: number;
  interesMoratorio: number;
  subtotalComponentes: number;
  totalPagosAplicados: number;
  saldoCalculado: number;
  saldoRegistrado: number;
  baseAcuerdo: number;
  descuentoAcuerdoVigente: number;
  diferencia: number;
  cuadra: boolean;
}

export interface CalcularDesgloseSaldoInput extends ComponentesSaldoCredicompras {
  interesMoratorio: number;
  totalPagosAplicados?: number;
  saldoRegistrado: number;
  descuentoAcuerdoVigente?: number;
}

/**
 * CREDICOMPRAS — hoja `data`:
 * SaldoTotal = capital + interés + gestión + cargos − devolución − descuentos − pagos.
 * El interés moratorio NO entra en SaldoTotal; se usa aparte en acuerdos.
 */
export function calcularDesgloseSaldo(
  input: CalcularDesgloseSaldoInput,
): DesgloseSaldoPrestamo {
  const montoPrestamo = roundMoney(input.montoPrestamo);
  const interes = roundMoney(input.interes);
  const gestionCobranza = roundMoney(input.gestionCobranza);
  const comisionCav = roundMoney(input.comisionCav);
  const comisionInsitu = roundMoney(input.comisionInsitu);
  const mantenimientoValor = roundMoney(input.mantenimientoValor);
  const seguroSvsd = roundMoney(input.seguroSvsd);
  const cargosAdmin = roundMoney(input.cargosAdmin);
  const devolucionSaldoFavor = roundMoney(input.devolucionSaldoFavor ?? 0);
  const descuentosArchivo = roundMoney(input.descuentosArchivo ?? 0);
  const interesMoratorio = roundMoney(input.interesMoratorio);
  const totalPagosAplicados = roundMoney(input.totalPagosAplicados ?? 0);
  const descuentoAcuerdoVigente = roundMoney(input.descuentoAcuerdoVigente ?? 0);

  const subtotalComponentes = roundMoney(
    montoPrestamo +
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
    Math.max(0, subtotalComponentes - totalPagosAplicados),
  );
  const saldoRegistrado = roundMoney(input.saldoRegistrado);
  const baseAcuerdo = roundMoney(saldoRegistrado + interesMoratorio);
  const diferencia = roundMoney(saldoRegistrado - saldoCalculado);
  const cuadra = Math.abs(diferencia) <= TOLERANCIA_SALDO_CUADRE;

  return {
    montoPrestamo,
    interes,
    gestionCobranza,
    comisionCav,
    comisionInsitu,
    mantenimientoValor,
    seguroSvsd,
    cargosAdmin,
    devolucionSaldoFavor,
    descuentosArchivo,
    interesMoratorio,
    subtotalComponentes,
    totalPagosAplicados,
    saldoCalculado,
    saldoRegistrado,
    baseAcuerdo,
    descuentoAcuerdoVigente,
    diferencia,
    cuadra,
  };
}
