import { prisma } from '@/lib/prisma';
import { filtroMandante, requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import {
  obtenerMetaRecuperacionMes,
} from './configuracion-cobranza-service';

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
): Promise<ForecastRecuperacion> {
  if (idmandante) {
    await requerirAccesoMandante(idusuario, idmandante);
  }

  const mandanteFilter = idmandante ?? (await filtroMandante(idusuario));
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const diasTranscurridos = hoy.getDate();
  const diasRestantesMes = finMes.getDate() - diasTranscurridos;

  const agg = await prisma.tbl_pago.aggregate({
    where: {
      deletedAt: null,
      aplicado: true,
      idmandante: mandanteFilter,
      fechaPago: { gte: inicioMes, lte: hoy },
    },
    _sum: { monto: true },
  });

  const recuperadoMesActual = roundMoney(decimalToNumber(agg._sum.monto));
  const runRateDiario =
    diasTranscurridos > 0
      ? roundMoney(recuperadoMesActual / diasTranscurridos)
      : 0;
  const forecastFinMes = roundMoney(
    recuperadoMesActual + runRateDiario * diasRestantesMes,
  );

  const metaMes = await obtenerMetaRecuperacionMes(idmandante);
  const pctMeta =
    metaMes > 0
      ? roundMoney((recuperadoMesActual / metaMes) * 100)
      : null;

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
