import { prisma } from '@/lib/prisma';
import {
  CLIENTE_NOMBRE_SELECT,
  formatNombreClienteDisplay,
} from '@/lib/logic/cliente-tipo-persona-logic';
import { requerirAccesoMandante } from './mandante-scope';
import { roundMoney } from './decimal-utils';
import type {
  ReporteReclamoSlaItem,
  ReporteReclamosSla,
} from '@/types/cobranza';

/**
 * Reclamos del mandante con control de SLA (fechaLimite).
 */
export async function obtenerReporteReclamosSla(
  idmandante: number,
  idusuario: number,
): Promise<ReporteReclamosSla> {
  await requerirAccesoMandante(idusuario, idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const ahora = new Date();
  const reclamosRaw = await prisma.tbl_reclamo.findMany({
    where: { idmandante, deletedAt: null },
    include: {
      cliente: {
        select: { ...CLIENTE_NOMBRE_SELECT },
      },
      prestamo: { select: { noPrestamo: true } },
    },
    orderBy: { fechaLimite: 'asc' },
  });

  const reclamos: ReporteReclamoSlaItem[] = reclamosRaw.map((r) => {
    const abierto =
      r.estado === 'ABIERTO' || r.estado === 'EN_PROCESO';
    const fueraSla = abierto && r.fechaLimite < ahora;
    const diasFueraSla = fueraSla
      ? Math.max(
          1,
          Math.floor(
            (ahora.getTime() - r.fechaLimite.getTime()) / 86_400_000,
          ),
        )
      : null;

    return {
      idreclamo: r.idreclamo,
      estado: r.estado,
      descripcion: r.descripcion.slice(0, 200),
      fechaLimite: r.fechaLimite.toISOString().slice(0, 10),
      createdAt: r.createdAt.toISOString().slice(0, 10),
      fueraSla,
      diasFueraSla,
      noPrestamo: r.prestamo?.noPrestamo ?? null,
      nombreCliente: formatNombreClienteDisplay(r.cliente),
    };
  });

  const abiertos = reclamos.filter((r) => r.estado === 'ABIERTO').length;
  const enProceso = reclamos.filter((r) => r.estado === 'EN_PROCESO').length;
  const resueltos = reclamos.filter((r) => r.estado === 'RESUELTO').length;
  const fueraSla = reclamos.filter((r) => r.fueraSla).length;
  const abiertosTotales = abiertos + enProceso;

  return {
    idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    totalReclamos: reclamos.length,
    abiertos,
    enProceso,
    resueltos,
    fueraSla,
    pctFueraSla:
      abiertosTotales > 0
        ? roundMoney((fueraSla / abiertosTotales) * 100)
        : 0,
    reclamos,
  };
}
