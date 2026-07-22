import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decimalToNumber, roundMoney } from './decimal-utils';
import {
  CLAVE_ACUERDO_DIAS_GRACIA,
  obtenerConfigNumericaMandante,
} from './configuracion-cobranza-service';
import { registrarAuditoria } from './auditoria-service';
import { condonarResidualTrasAcuerdoCumplido } from './acuerdo-condonacion-service';
import {
  sincronizarEstadoPorSaldo,
  transicionarEstadoPrestamo,
} from './estado-prestamo-service';
import { sincronizarMoraPrestamo } from './dias-mora-service';

type Tx = Prisma.TransactionClient;

const TOLERANCIA_CUOTA = 0.99;

export interface CuotaParaAbono {
  idcuota: number;
  numeroCuota: number;
  montoCuota: number;
  estado: string;
}

export interface ResultadoAbonoCuota {
  idcuota: number;
  /** Estado objetivo tras el abono (VENCIDA se preserva si no quedó pagada). */
  estadoNuevo: 'PAGADA' | 'PENDIENTE' | 'VENCIDA';
}

/**
 * Distribuye el total pagado en cuotas (orden ASC).
 * Acumula abonos parciales: varios pagos suman hasta cubrir cada cuota.
 */
export function calcularAbonoCuotasPorTotal(
  cuotas: CuotaParaAbono[],
  totalPagado: number,
): ResultadoAbonoCuota[] {
  let disponible = roundMoney(Math.max(0, totalPagado));
  const ordenadas = [...cuotas].sort(
    (a, b) => a.numeroCuota - b.numeroCuota,
  );
  const resultados: ResultadoAbonoCuota[] = [];
  let coberturaAgotada = false;

  for (const cuota of ordenadas) {
    const montoCuota = roundMoney(cuota.montoCuota);

    if (!coberturaAgotada && disponible >= montoCuota * TOLERANCIA_CUOTA) {
      resultados.push({ idcuota: cuota.idcuota, estadoNuevo: 'PAGADA' });
      disponible = roundMoney(disponible - montoCuota);
      continue;
    }

    coberturaAgotada = true;
    const estadoNuevo =
      cuota.estado === 'VENCIDA' ? 'VENCIDA' : 'PENDIENTE';
    resultados.push({ idcuota: cuota.idcuota, estadoNuevo });
  }

  return resultados;
}

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

  const diasGracia = await obtenerConfigNumericaMandante(
    CLAVE_ACUERDO_DIAS_GRACIA,
    acuerdo.idmandante,
  );
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
    await condonarResidualTrasAcuerdoCumplido(tx, {
      idprestamo: acuerdo.idprestamo,
      idacuerdo,
      idusuario,
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

/**
 * Marca cuotas PAGADA según el total de pagos aplicados del acuerdo
 * (abonos parciales se acumulan entre pagos).
 */
export async function sincronizarCuotasAcuerdoPorPagos(
  tx: Tx,
  idacuerdo: number,
  idpagoReferencia?: number | null,
): Promise<void> {
  const [agg, cuotas, ultimoPago] = await Promise.all([
    tx.tbl_pago.aggregate({
      where: {
        idacuerdo,
        aplicado: true,
        deletedAt: null,
      },
      _sum: { monto: true },
    }),
    tx.tbl_acuerdo_cuota.findMany({
      where: { idacuerdo },
      orderBy: { numeroCuota: 'asc' },
    }),
    idpagoReferencia
      ? Promise.resolve({ idpago: idpagoReferencia })
      : tx.tbl_pago.findFirst({
          where: { idacuerdo, aplicado: true, deletedAt: null },
          orderBy: [{ fechaPago: 'desc' }, { idpago: 'desc' }],
          select: { idpago: true },
        }),
  ]);

  const totalPagado = decimalToNumber(agg._sum.monto);
  const plan = calcularAbonoCuotasPorTotal(
    cuotas.map((c) => ({
      idcuota: c.idcuota,
      numeroCuota: c.numeroCuota,
      montoCuota: decimalToNumber(c.montoCuota),
      estado: c.estado,
    })),
    totalPagado,
  );

  for (const item of plan) {
    const actual = cuotas.find((c) => c.idcuota === item.idcuota);
    if (!actual) {
      continue;
    }

    const mismoEstado = actual.estado === item.estadoNuevo;
    const faltaIdpago =
      item.estadoNuevo === 'PAGADA' &&
      actual.idpago == null &&
      ultimoPago?.idpago != null;

    if (mismoEstado && !faltaIdpago) {
      continue;
    }

    await tx.tbl_acuerdo_cuota.update({
      where: { idcuota: item.idcuota },
      data: {
        estado: item.estadoNuevo,
        idpago:
          item.estadoNuevo === 'PAGADA' ? (ultimoPago?.idpago ?? null) : null,
      },
    });
  }
}

/** Compat: sincroniza cuotas del acuerdo (acumula parciales). */
export async function marcarCuotaPagadaPorMonto(
  tx: Tx,
  idacuerdo: number,
  _montoPago: number,
  idpago: number,
): Promise<void> {
  await sincronizarCuotasAcuerdoPorPagos(tx, idacuerdo, idpago);
}

/**
 * Revierte el efecto de un pago sobre cuotas y re-sincroniza el acuerdo.
 */
export async function revertirCuotasPorPago(
  tx: Tx,
  idpago: number,
  idusuario?: number | null,
): Promise<void> {
  const pago = await tx.tbl_pago.findUnique({
    where: { idpago },
    select: { idacuerdo: true },
  });

  const cuotasConPago = await tx.tbl_acuerdo_cuota.findMany({
    where: { idpago },
    select: { idacuerdo: true },
  });

  const idacuerdos = new Set<number>();
  if (pago?.idacuerdo != null) {
    idacuerdos.add(pago.idacuerdo);
  }
  for (const c of cuotasConPago) {
    idacuerdos.add(c.idacuerdo);
  }

  if (idacuerdos.size === 0) {
    return;
  }

  for (const idacuerdo of idacuerdos) {
    await sincronizarCuotasAcuerdoPorPagos(tx, idacuerdo);

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
