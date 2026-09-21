import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import { simularLiquidacion } from './liquidacion-service';
import type { ReporteComisionesVsProyeccion } from '@/types/cobranza';

/**
 * Contrasta comisión proyectada (pagos aplicados) vs liquidación persistida.
 */
export async function obtenerReporteComisionesVsProyeccion(
  idmandante: number,
  idusuario: number,
  periodo: string,
): Promise<ReporteComisionesVsProyeccion> {
  await requerirAccesoMandante(idusuario, idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const { inicio, fin, periodo: periodoNorm } = parsePeriodo(periodo);
  const sim = await simularLiquidacion(idmandante, periodoNorm, idusuario);
  const esPeriodoMensual = /^\d{4}-\d{2}$/.test(periodo.trim());
  let liquidadoRecuperado = 0;
  let liquidadoComision = 0;
  let cantidadLiquidaciones = 0;
  let liquidacionEstados: string[] = [];
  let idliquidacion: number | null = null;
  let liquidacionEstado: string | null = null;

  if (esPeriodoMensual) {
    // Compatibilidad del contrato anterior: YYYY-MM identifica exactamente
    // la liquidación persistida del mes y usa sus totales contables.
    const liquidacion = await prisma.tbl_liquidacion.findFirst({
      where: { idmandante, periodo: periodoNorm, deletedAt: null },
      orderBy: { idliquidacion: 'desc' },
    });
    if (liquidacion) {
      liquidadoRecuperado = decimalToNumber(liquidacion.totalRecuperado);
      liquidadoComision = decimalToNumber(liquidacion.totalComision);
      cantidadLiquidaciones = 1;
      liquidacionEstados = [liquidacion.estado];
      idliquidacion = liquidacion.idliquidacion;
      liquidacionEstado = liquidacion.estado;
    }
  } else {
    const liquidaciones = await prisma.tbl_liquidacion.findMany({
      where: {
        idmandante,
        deletedAt: null,
        detalle: {
          some: { pago: { fechaPago: { gte: inicio, lt: fin } } },
        },
      },
      include: {
        detalle: {
          where: { pago: { fechaPago: { gte: inicio, lt: fin } } },
          select: { monto: true, montoComision: true },
        },
      },
    });
    cantidadLiquidaciones = liquidaciones.length;
    liquidacionEstados = [...new Set(liquidaciones.map((liq) => liq.estado))];
    if (liquidaciones.length === 1) {
      idliquidacion = liquidaciones[0].idliquidacion;
      liquidacionEstado = liquidaciones[0].estado;
    }
    liquidadoRecuperado = liquidaciones.reduce(
      (total, liquidacion) =>
        total +
        liquidacion.detalle.reduce(
          (subtotal, detalle) => subtotal + decimalToNumber(detalle.monto),
          0,
        ),
      0,
    );
    liquidadoComision = liquidaciones.reduce(
      (total, liquidacion) =>
        total +
        liquidacion.detalle.reduce(
          (subtotal, detalle) =>
            subtotal + decimalToNumber(detalle.montoComision),
          0,
        ),
      0,
    );
  }

  const diferencialComision = roundMoney(sim.totalComision - liquidadoComision);
  const diferencialRecuperado = roundMoney(
    sim.totalRecuperado - liquidadoRecuperado,
  );
  const pctLiquidadoVsProyectado =
    sim.totalComision > 0
      ? roundMoney((liquidadoComision / sim.totalComision) * 100)
      : liquidadoComision === 0
        ? 100
        : 0;

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: periodoNorm,
    proyectadoRecuperado: sim.totalRecuperado,
    proyectadoIngresoEmpresa: sim.totalIngresoEmpresa,
    proyectadoComision: sim.totalComision,
    proyectadoPagos: sim.cantidadPagos,
    liquidadoRecuperado: roundMoney(liquidadoRecuperado),
    liquidadoComision: roundMoney(liquidadoComision),
    liquidacionEstado,
    idliquidacion,
    cantidadLiquidaciones,
    liquidacionEstados,
    diferencialComision,
    diferencialRecuperado,
    pctLiquidadoVsProyectado,
  };
}
