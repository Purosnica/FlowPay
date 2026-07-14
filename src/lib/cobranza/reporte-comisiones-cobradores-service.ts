import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import type {
  ReporteComisionCobradorItem,
  ReporteComisionesCobradores,
} from '@/types/cobranza';

/**
 * Reporte de comisiones a cobradores agrupadas por liquidación y gestor.
 */
export async function obtenerReporteComisionesCobradores(
  idmandante: number,
  idusuario: number,
  periodo?: string | null,
): Promise<ReporteComisionesCobradores> {
  await requerirAccesoMandante(idusuario, idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  let periodoLabel: string | null = null;
  const wherePeriodo: { periodo?: string } = {};
  if (periodo) {
    const parsed = parsePeriodo(periodo);
    periodoLabel = parsed.periodo;
    wherePeriodo.periodo = parsed.periodo;
  }

  const liquidaciones = await prisma.tbl_liquidacion.findMany({
    where: {
      idmandante,
      deletedAt: null,
      ...wherePeriodo,
    },
    include: {
      detalle: {
        select: {
          idgestor: true,
          nombreGestor: true,
          monto: true,
          ingresoEmpresa: true,
          montoComision: true,
        },
      },
    },
    orderBy: [{ periodo: 'desc' }, { idliquidacion: 'desc' }],
  });

  const porCobrador: ReporteComisionCobradorItem[] = [];
  let totalComision = 0;
  let totalComisionBorrador = 0;
  let totalComisionEmitida = 0;
  let totalComisionPagada = 0;

  for (const liq of liquidaciones) {
    const porGestor = new Map<
      string,
      {
        idgestor: number | null;
        nombreGestor: string;
        cantidadPagos: number;
        totalRecuperado: number;
        totalIngresoEmpresa: number;
        totalComision: number;
      }
    >();

    for (const d of liq.detalle) {
      const key = d.idgestor != null ? String(d.idgestor) : 'null';
      const prev = porGestor.get(key) ?? {
        idgestor: d.idgestor,
        nombreGestor: d.nombreGestor ?? 'Sin gestor',
        cantidadPagos: 0,
        totalRecuperado: 0,
        totalIngresoEmpresa: 0,
        totalComision: 0,
      };
      prev.cantidadPagos += 1;
      prev.totalRecuperado += decimalToNumber(d.monto);
      prev.totalIngresoEmpresa += decimalToNumber(d.ingresoEmpresa);
      prev.totalComision += decimalToNumber(d.montoComision);
      porGestor.set(key, prev);
    }

    for (const g of porGestor.values()) {
      const comision = roundMoney(g.totalComision);
      totalComision += comision;
      if (liq.estado === 'BORRADOR') {
        totalComisionBorrador += comision;
      } else if (liq.estado === 'EMITIDA') {
        totalComisionEmitida += comision;
      } else if (liq.estado === 'PAGADA') {
        totalComisionPagada += comision;
      }

      porCobrador.push({
        idliquidacion: liq.idliquidacion,
        periodo: liq.periodo,
        estado: liq.estado,
        idgestor: g.idgestor,
        nombreGestor: g.nombreGestor,
        cantidadPagos: g.cantidadPagos,
        totalRecuperado: roundMoney(g.totalRecuperado),
        totalIngresoEmpresa: roundMoney(g.totalIngresoEmpresa),
        totalComision: comision,
      });
    }
  }

  porCobrador.sort((a, b) => {
    if (a.periodo !== b.periodo) {
      return b.periodo.localeCompare(a.periodo);
    }
    return b.totalComision - a.totalComision;
  });

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: periodoLabel,
    totalComision: roundMoney(totalComision),
    totalComisionBorrador: roundMoney(totalComisionBorrador),
    totalComisionEmitida: roundMoney(totalComisionEmitida),
    totalComisionPagada: roundMoney(totalComisionPagada),
    cantidadLiquidaciones: liquidaciones.length,
    porCobrador,
  };
}
