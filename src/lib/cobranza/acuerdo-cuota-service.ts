import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decimalToNumber, roundMoney } from './decimal-utils';
import {
  CLAVE_ACUERDO_DIAS_GRACIA,
  obtenerConfigNumerica,
} from './configuracion-cobranza-service';
import { registrarAuditoria } from './auditoria-service';
import {
  sincronizarEstadoPorSaldo,
  transicionarEstadoPrestamo,
} from './estado-prestamo-service';
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
  const montoBase = roundMoney(params.montoAcordado / params.numeroCuotas);
  const cuotas = [];
  let acumulado = 0;

  for (let i = 0; i < params.numeroCuotas; i++) {
    const fechaVencimiento = new Date(params.fechaInicio);
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + i);
    const esUltima = i === params.numeroCuotas - 1;
    const montoCuota = esUltima
      ? roundMoney(params.montoAcordado - acumulado)
      : montoBase;
    acumulado = roundMoney(acumulado + montoCuota);
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
    return (acuerdo?.estado as 'VIGENTE' | 'CUMPLIDO' | 'ROTO') ?? 'VIGENTE';
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
    await sincronizarEstadoPorSaldo(tx, acuerdo.idprestamo, idusuario);

    const prestamo = await tx.tbl_prestamo.findUnique({
      where: { idprestamo: acuerdo.idprestamo },
      select: { estado: true, saldoTotal: true, diasMora: true },
    });
    if (prestamo && prestamo.estado === 'Con acuerdo') {
      const saldo = decimalToNumber(prestamo.saldoTotal);
      const estadoNuevo =
        saldo <= 0 ? 'Cancelado' : prestamo.diasMora > 0 ? 'Vencido' : 'Vigente';
      await transicionarEstadoPrestamo(tx, {
        idprestamo: acuerdo.idprestamo,
        estadoNuevo,
        idusuario,
        motivo: 'Acuerdo cumplido',
      });
    }

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
      restante = roundMoney(restante - montoCuota);
    }
  }
}

/**
 * Revierte cuotas marcadas por un pago y reevalúa el acuerdo.
 */
export async function revertirCuotasPorPago(
  tx: Tx,
  idpago: number,
  idusuario?: number | null,
): Promise<void> {
  const cuotas = await tx.tbl_acuerdo_cuota.findMany({
    where: { idpago, estado: 'PAGADA' },
    select: { idcuota: true, idacuerdo: true },
  });
  if (cuotas.length === 0) {
    return;
  }

  const idacuerdos = [...new Set(cuotas.map((c) => c.idacuerdo))];

  for (const cuota of cuotas) {
    await tx.tbl_acuerdo_cuota.update({
      where: { idcuota: cuota.idcuota },
      data: { estado: 'PENDIENTE', idpago: null },
    });
  }

  for (const idacuerdo of idacuerdos) {
    const acuerdo = await tx.tbl_acuerdo.findUnique({
      where: { idacuerdo },
    });
    if (!acuerdo || acuerdo.deletedAt) {
      continue;
    }

    if (acuerdo.estado === 'CUMPLIDO') {
      await tx.tbl_acuerdo.update({
        where: { idacuerdo },
        data: { estado: 'VIGENTE' },
      });
      await tx.tbl_prestamo.update({
        where: { idprestamo: acuerdo.idprestamo },
        data: { reportableCentralRiesgo: false },
      });
    }

    await evaluarCuotasAcuerdo(tx, idacuerdo, idusuario);
  }
}
