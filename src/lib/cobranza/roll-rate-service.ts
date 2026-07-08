import { prisma } from '@/lib/prisma';
import { filtroMandante, requerirAccesoMandante } from './mandante-scope';

export interface RollRateBucket {
  estadoOrigen: string;
  estadoDestino: string;
  cantidad: number;
  pct: number;
}

export interface RollRateResumen {
  periodoDesde: string;
  periodoHasta: string;
  buckets: RollRateBucket[];
  totalTransiciones: number;
}

export async function calcularRollRate(
  idusuario: number,
  mesesAtras = 3,
  idmandante?: number,
): Promise<RollRateResumen> {
  if (idmandante) {
    await requerirAccesoMandante(idusuario, idmandante);
  }

  const mandanteFilter = idmandante ?? (await filtroMandante(idusuario));
  const hasta = new Date();
  const desde = new Date(hasta);
  desde.setMonth(desde.getMonth() - mesesAtras);

  const transiciones = await prisma.tbl_prestamo_estado_historial.findMany({
    where: {
      createdAt: { gte: desde, lte: hasta },
      estadoAnterior: { not: null },
      prestamo: {
        deletedAt: null,
        idmandante: mandanteFilter,
      },
    },
    select: { estadoAnterior: true, estadoNuevo: true },
  });

  const conteo = new Map<string, number>();
  for (const t of transiciones) {
    const key = `${t.estadoAnterior ?? 'N/A'}|${t.estadoNuevo}`;
    conteo.set(key, (conteo.get(key) ?? 0) + 1);
  }

  const porOrigen = new Map<string, number>();
  for (const [key, cant] of conteo) {
    const origen = key.split('|')[0];
    porOrigen.set(origen, (porOrigen.get(origen) ?? 0) + cant);
  }

  const buckets: RollRateBucket[] = [];
  for (const [key, cantidad] of conteo) {
    const [estadoOrigen, estadoDestino] = key.split('|');
    const totalOrigen = porOrigen.get(estadoOrigen) ?? 1;
    buckets.push({
      estadoOrigen,
      estadoDestino,
      cantidad,
      pct: Math.round((cantidad / totalOrigen) * 1000) / 10,
    });
  }

  buckets.sort((a, b) => b.cantidad - a.cantidad);

  return {
    periodoDesde: desde.toISOString().slice(0, 10),
    periodoHasta: hasta.toISOString().slice(0, 10),
    buckets,
    totalTransiciones: transiciones.length,
  };
}
