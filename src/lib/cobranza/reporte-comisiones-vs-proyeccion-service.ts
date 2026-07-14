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

  const { periodo: periodoNorm } = parsePeriodo(periodo);
  const sim = await simularLiquidacion(idmandante, periodoNorm, idusuario);

  const liquidacion = await prisma.tbl_liquidacion.findFirst({
    where: {
      idmandante,
      periodo: periodoNorm,
      deletedAt: null,
    },
    orderBy: { idliquidacion: 'desc' },
  });

  const liquidadoRecuperado = liquidacion
    ? decimalToNumber(liquidacion.totalRecuperado)
    : 0;
  const liquidadoComision = liquidacion
    ? decimalToNumber(liquidacion.totalComision)
    : 0;

  const diferencialComision = roundMoney(
    sim.totalComision - liquidadoComision,
  );
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
    liquidacionEstado: liquidacion?.estado ?? null,
    idliquidacion: liquidacion?.idliquidacion ?? null,
    diferencialComision,
    diferencialRecuperado,
    pctLiquidadoVsProyectado,
  };
}
