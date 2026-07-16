import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import {
  cargarTramosRecuperacionMandante,
  comisionTramosADefs,
} from './comision-cobro-service';
import {
  resolverTramoMoraDef,
  type TramoMoraDef,
} from './tramos-mora';
import type {
  ReporteMigracionMora,
  ReporteMigracionMoraItem,
} from '@/types/cobranza';

function tramoLabel(defs: TramoMoraDef[], diasMora: number): string {
  return resolverTramoMoraDef(defs, diasMora)?.tramo ?? 'Sin tramo';
}

/**
 * Migración de préstamos entre tramos de mora del Mandante
 * (corte inicio vs fin periodo).
 */
export async function obtenerReporteMigracionMora(
  idmandante: number,
  idusuario: number,
  periodo: string,
): Promise<ReporteMigracionMora> {
  await requerirAccesoMandante(idusuario, idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const { inicio, fin, periodo: periodoNorm } = parsePeriodo(periodo);
  const fechaDestino = new Date(fin);
  fechaDestino.setDate(fechaDestino.getDate() - 1);

  const [prestamos, tramosRecuperacion] = await Promise.all([
    prisma.tbl_prestamo.findMany({
      where: {
        idmandante,
        deletedAt: null,
        estado: { notIn: ['Cancelado', 'Finalizado'] },
      },
      select: {
        idprestamo: true,
        diasMora: true,
        saldoTotal: true,
        cortes: {
          select: { fechaCorte: true, diasMora: true },
          orderBy: { fechaCorte: 'desc' },
        },
      },
    }),
    cargarTramosRecuperacionMandante(idmandante),
  ]);

  const defs = comisionTramosADefs(tramosRecuperacion);
  const conteo = new Map<string, { cantidad: number; saldo: number }>();
  let totalPrestamos = 0;

  for (const p of prestamos) {
    const corteOrigen = p.cortes.find((c) => c.fechaCorte < inicio);
    const corteDestino = p.cortes.find(
      (c) => c.fechaCorte >= inicio && c.fechaCorte < fin,
    );

    const diasOrigen = corteOrigen?.diasMora ?? p.diasMora;
    const diasDestino = corteDestino?.diasMora ?? p.diasMora;
    const tramoOrigen = tramoLabel(defs, diasOrigen);
    const tramoDestino = tramoLabel(defs, diasDestino);

    totalPrestamos += 1;
    const key = `${tramoOrigen}|${tramoDestino}`;
    const prev = conteo.get(key) ?? { cantidad: 0, saldo: 0 };
    prev.cantidad += 1;
    prev.saldo += decimalToNumber(p.saldoTotal);
    conteo.set(key, prev);
  }

  const porOrigen = new Map<string, number>();
  for (const [key, v] of conteo) {
    const origen = key.split('|')[0];
    porOrigen.set(origen, (porOrigen.get(origen) ?? 0) + v.cantidad);
  }

  const migraciones: ReporteMigracionMoraItem[] = [...conteo.entries()]
    .map(([key, v]) => {
      const [tramoOrigen, tramoDestino] = key.split('|');
      const totalOrigen = porOrigen.get(tramoOrigen) ?? 1;
      return {
        tramoOrigen,
        tramoDestino,
        cantidad: v.cantidad,
        saldoDestino: roundMoney(v.saldo),
        pct: roundMoney((v.cantidad / totalOrigen) * 100),
      };
    })
    .sort((a, b) => b.cantidad - a.cantidad);

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: periodoNorm,
    fechaOrigen: inicio.toISOString().slice(0, 10),
    fechaDestino: fechaDestino.toISOString().slice(0, 10),
    totalPrestamos,
    migraciones,
  };
}
