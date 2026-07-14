import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import type {
  ReporteConcentracionItem,
  ReporteConcentracionRiesgo,
} from '@/types/cobranza';

function nombreCliente(row: {
  primer_nombres: string;
  segundo_nombres: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
}): string {
  return [
    row.primer_nombres,
    row.segundo_nombres,
    row.primer_apellido,
    row.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Top deudores y gestores por saldo en mora.
 */
export async function obtenerReporteConcentracionRiesgo(
  idmandante: number,
  idusuario: number,
  topN = 10,
): Promise<ReporteConcentracionRiesgo> {
  await requerirAccesoMandante(idusuario, idmandante);

  const limit = Number.isInteger(topN) && topN > 0 ? Math.min(topN, 50) : 10;

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const prestamos = await prisma.tbl_prestamo.findMany({
    where: {
      idmandante,
      deletedAt: null,
      diasMora: { gt: 0 },
      saldoTotal: { gt: 0 },
      estado: { notIn: ['Cancelado', 'Finalizado'] },
    },
    select: {
      idcliente: true,
      idgestorAsignado: true,
      saldoTotal: true,
      cliente: {
        select: {
          idcliente: true,
          primer_nombres: true,
          segundo_nombres: true,
          primer_apellido: true,
          segundo_apellido: true,
        },
      },
      gestor: { select: { idusuario: true, nombre: true } },
    },
  });

  const saldoMoraTotal = roundMoney(
    prestamos.reduce((s, p) => s + decimalToNumber(p.saldoTotal), 0),
  );

  const porDeudor = new Map<
    number,
    { nombre: string; cantidad: number; saldo: number }
  >();
  const porGestor = new Map<
    number,
    { nombre: string; cantidad: number; saldo: number }
  >();

  for (const p of prestamos) {
    const saldo = decimalToNumber(p.saldoTotal);
    const d = porDeudor.get(p.idcliente) ?? {
      nombre: p.cliente ? nombreCliente(p.cliente) : `Cliente #${p.idcliente}`,
      cantidad: 0,
      saldo: 0,
    };
    d.cantidad += 1;
    d.saldo += saldo;
    porDeudor.set(p.idcliente, d);

    if (p.idgestorAsignado != null) {
      const g = porGestor.get(p.idgestorAsignado) ?? {
        nombre: p.gestor?.nombre ?? `Gestor #${p.idgestorAsignado}`,
        cantidad: 0,
        saldo: 0,
      };
      g.cantidad += 1;
      g.saldo += saldo;
      porGestor.set(p.idgestorAsignado, g);
    }
  }

  const toItems = (
    tipo: string,
    mapa: Map<number, { nombre: string; cantidad: number; saldo: number }>,
  ): ReporteConcentracionItem[] =>
    [...mapa.entries()]
      .map(([id, v]) => ({
        tipo,
        id,
        nombre: v.nombre,
        cantidadPrestamos: v.cantidad,
        saldoMora: roundMoney(v.saldo),
        shareSaldoPct:
          saldoMoraTotal > 0
            ? roundMoney((v.saldo / saldoMoraTotal) * 100)
            : 0,
      }))
      .sort((a, b) => b.saldoMora - a.saldoMora)
      .slice(0, limit);

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    saldoMoraTotal,
    topDeudores: toItems('DEUDOR', porDeudor),
    topGestores: toItems('GESTOR', porGestor),
  };
}
