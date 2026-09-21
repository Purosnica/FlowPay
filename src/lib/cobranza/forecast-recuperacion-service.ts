import { prisma } from '@/lib/prisma';
import { filtroMandante, requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { obtenerMetaRecuperacionMes } from './configuracion-cobranza-service';
import {
  factorMesesEnRango,
  finRangoHastaHoy,
  filtroFechaEnPeriodo,
  parsePeriodo,
  rangoPeriodoActual,
} from './periodo-utils';

export interface ForecastRecuperacion {
  recuperadoMesActual: number;
  diasTranscurridos: number;
  diasRestantesMes: number;
  runRateDiario: number;
  forecastFinMes: number;
  metaMes?: number | null;
  pctMeta?: number | null;
}

export async function calcularForecastRecuperacion(
  idusuario: number,
  idmandante?: number,
  periodo?: string | null
): Promise<ForecastRecuperacion> {
  if (idmandante) {
    await requerirAccesoMandante(idusuario, idmandante);
  }

  const mandanteFilter = idmandante ?? (await filtroMandante(idusuario));
  const rango = periodo ? parsePeriodo(periodo) : rangoPeriodoActual();
  const { inicio, fin } = rango;
  const msDia = 24 * 60 * 60 * 1000;
  const diasMes = Math.round((fin.getTime() - inicio.getTime()) / msDia);
  const corte = finRangoHastaHoy(rango);
  const diasTranscurridos = Math.max(0, Math.ceil((corte.getTime() - inicio.getTime()) / msDia));
  const diasRestantesMes = Math.max(0, diasMes - diasTranscurridos);

  const agg = await prisma.tbl_pago.aggregate({
    where: {
      deletedAt: null,
      aplicado: true,
      idmandante: mandanteFilter,
      fechaPago: filtroFechaEnPeriodo({ inicio, fin: corte }),
    },
    _sum: { monto: true },
  });

  const recuperadoMesActual = roundMoney(decimalToNumber(agg._sum.monto));
  const runRateDiario =
    diasTranscurridos > 0 ? roundMoney(recuperadoMesActual / diasTranscurridos) : 0;
  const forecastFinMes = roundMoney(recuperadoMesActual + runRateDiario * diasRestantesMes);

  const metaMensual = await obtenerMetaRecuperacionMes(idmandante);
  const metaMes = roundMoney(metaMensual * factorMesesEnRango(rango));
  const pctMeta = metaMes > 0 ? roundMoney((recuperadoMesActual / metaMes) * 100) : null;

  return {
    recuperadoMesActual,
    diasTranscurridos,
    diasRestantesMes,
    runRateDiario,
    forecastFinMes,
    metaMes: metaMes > 0 ? metaMes : null,
    pctMeta,
  };
}
