import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decimalToNumber } from './decimal-utils';
import {
  CLAVE_ACUERDO_DIAS_GRACIA,
  obtenerConfigNumerica,
} from './configuracion-cobranza-service';
import { registrarAuditoria } from './auditoria-service';
import { transicionarEstadoPrestamo } from './estado-prestamo-service';
import { sincronizarMoraPrestamo } from './dias-mora-service';

type Tx = Prisma.TransactionClient;

export async function generarCuotasAcuerdo(
  tx: Tx,
  params: {
    idacuerdo: number;
    montoAcordado: number;
    numeroCuotas: number;
    fechaInicio: Date;
  },
): Promise<void> {
  const montoCuota = params.montoAcordado / params.numeroCuotas;
  const cuotas = [];

  for (let i = 0; i < params.numeroCuotas; i++) {
    const fechaVencimiento = new Date(params.fechaInicio);
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + i);
    cuotas.push({
      idacuerdo: params.idacuerdo,
      numeroCuota: i + 1,
      montoCuota,
      fechaVencimiento,
      estado: 'PENDIENTE',
    });
  }

  await tx.tbl_acuerdo_cuota.createMany({ data: cuotas });
}

export async function evaluarCuotasAcuerdo(
  tx: Tx,
  idacuerdo: number,
  idusuario?: number | null,
): Promise<'VIGENTE' | 'CUMPLIDO' | 'ROTO'> {
  const acuerdo = await tx.tbl_acuerdo.findUnique({
    where: { idacuerdo },
    include: { cuotas: { orderBy: { numeroCuota: 'asc' } } },
  });

  if (!acuerdo || acuerdo.estado !== 'VIGENTE') {
    return acuerdo?.estado as 'VIGENTE' | 'CUMPLIDO' | 'ROTO' ?? 'VIGENTE';
  }

  const diasGracia = await obtenerConfigNumerica(CLAVE_ACUERDO_DIAS_GRACIA);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let todasPagadas = true;
  let hayRoto = false;

  for (const cuota of acuerdo.cuotas) {
    if (cuota.estado === 'PAGADA') {
      continue;
    }
    todasPagadas = false;

    const vence = new Date(cuota.fechaVencimiento);
    vence.setHours(0, 0, 0, 0);
    const limite = new Date(vence);
    limite.setDate(limite.getDate() + diasGracia);

    if (hoy > limite) {
      await tx.tbl_acuerdo_cuota.update({
        where: { idcuota: cuota.idcuota },
        data: { estado: 'VENCIDA' },
      });
      hayRoto = true;
    }
  }

  if (todasPagadas && acuerdo.cuotas.length > 0) {
    await tx.tbl_acuerdo.update({
      where: { idacuerdo },
      data: { estado: 'CUMPLIDO' },
    });
    await tx.tbl_prestamo.update({
      where: { idprestamo: acuerdo.idprestamo },
      data: { reportableCentralRiesgo: true },
    });
    await transicionarEstadoPrestamo(tx, {
      idprestamo: acuerdo.idprestamo,
      estadoNuevo: 'Vencido',
      idusuario,
      motivo: 'Acuerdo cumplido',
      forzar: true,
    });
    await sincronizarMoraPrestamo(tx, acuerdo.idprestamo, idusuario);
    return 'CUMPLIDO';
  }

  if (hayRoto) {
    await tx.tbl_acuerdo.update({
      where: { idacuerdo },
      data: { estado: 'ROTO' },
    });
    await tx.tbl_prestamo.update({
      where: { idprestamo: acuerdo.idprestamo },
      data: { reportableCentralRiesgo: true },
    });
    await transicionarEstadoPrestamo(tx, {
      idprestamo: acuerdo.idprestamo,
      estadoNuevo: 'Vencido',
      idusuario,
      motivo: 'Acuerdo roto por cuota vencida',
      forzar: true,
    });
    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'tbl_acuerdo',
      entidadId: idacuerdo,
      accion: 'ROTO_AUTOMATICO',
      detalle: JSON.stringify({ motivo: 'Cuota vencida fuera de gracia' }),
    });
    await sincronizarMoraPrestamo(tx, acuerdo.idprestamo, idusuario);
    return 'ROTO';
  }

  return 'VIGENTE';
}

export async function procesarAcuerdosVencidos(
  idusuario?: number | null,
): Promise<{ evaluados: number; rotos: number }> {
  const vigentes = await prisma.tbl_acuerdo.findMany({
    where: { estado: 'VIGENTE', deletedAt: null },
    select: { idacuerdo: true },
  });

  let rotos = 0;

  for (const { idacuerdo } of vigentes) {
    const resultado = await prisma.$transaction(async (tx) =>
      evaluarCuotasAcuerdo(tx, idacuerdo, idusuario),
    );
    if (resultado === 'ROTO') {
      rotos++;
    }
  }

  return { evaluados: vigentes.length, rotos };
}

export async function marcarCuotaPagadaPorMonto(
  tx: Tx,
  idacuerdo: number,
  montoPago: number,
  idpago: number,
): Promise<void> {
  const cuotasPendientes = await tx.tbl_acuerdo_cuota.findMany({
    where: { idacuerdo, estado: { in: ['PENDIENTE', 'VENCIDA'] } },
    orderBy: { numeroCuota: 'asc' },
  });

  let restante = montoPago;
  for (const cuota of cuotasPendientes) {
    if (restante <= 0) {
      break;
    }
    const montoCuota = decimalToNumber(cuota.montoCuota);
    if (restante >= montoCuota * 0.99) {
      await tx.tbl_acuerdo_cuota.update({
        where: { idcuota: cuota.idcuota },
        data: { estado: 'PAGADA', idpago },
      });
      restante -= montoCuota;
    }
  }
}
