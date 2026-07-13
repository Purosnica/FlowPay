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

export function extraerDatosFinancierosCartera(
  fila: FilaCarteraParseada,
): DatosFinancierosCartera {
  return {
    saldoTotal: valorNumero(fila.valores.saldoTotal),
    montoPrestamo: valorNumero(fila.valores.montoPrestamo),
    interes: valorNumero(fila.valores.interes),
    interesMoratorio: valorNumero(fila.valores.interesMoratorio),
    comisionCav: valorNumero(fila.valores.comisionCav),
    comisionInsitu: valorNumero(fila.valores.comisionInsitu),
    mantenimientoValor: valorNumero(fila.valores.mantenimientoValor),
    gestionCobranza: valorNumero(fila.valores.gestionCobranza),
    seguroSvsd: valorNumero(fila.valores.seguroSvsd),
    cargosAdmin: valorNumero(fila.valores.cargosAdmin),
    devolucionSaldoFavor: valorNumero(fila.valores.devolucionSaldoFavor),
    descuentosArchivo: valorNumero(fila.valores.descuentosArchivo),
    totalPagosArchivo: valorNumero(fila.valores.totalPagosArchivo),
  };
}
