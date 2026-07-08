import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import {
  calcularComisionPago,
  mapComisiones,
} from './comision-cobro-service';
import {
  cargarMapaComisionCobradorMandante,
  resolverComisionDesdeMapa,
} from './comision-cobrador-service';
import type {
  DetallePagoLiquidacion,
  SimulacionLiquidacion,
} from '@/types/cobranza';

export type { DetallePagoLiquidacion, SimulacionLiquidacion };

export interface GenerarLiquidacionParams {
  idmandante: number;
  periodo: string;
  idusuario: number;
}

interface PagoLiquidacionRow {
  idpago: number;
  idprestamo: number;
  monto: number;
  noPrestamo: string;
  diasMora: number;
  idgestor: number | null;
  nombreGestor: string | null;
  porcentajeComisionCobrador: number;
}

async function cargarPagosPeriodo(
  idmandante: number,
  inicio: Date,
  fin: Date,
  mapaComision: Map<number, number | null>,
): Promise<PagoLiquidacionRow[]> {
  const pagos = await prisma.tbl_pago.findMany({
    where: {
      idmandante,
      deletedAt: null,
      aplicado: true,
      fechaPago: { gte: inicio, lt: fin },
    },
    include: {
      prestamo: {
        select: {
          noPrestamo: true,
          diasMora: true,
          idgestorAsignado: true,
          gestor: { select: { nombre: true, porcentajeComision: true } },
        },
      },
      gestor: {
        select: { nombre: true, porcentajeComision: true },
      },
    },
    orderBy: { fechaPago: 'asc' },
  });

  return pagos.map((p) => {
    const gestorRegistro = p.gestor;
    const gestorPrestamo = p.prestamo.gestor;
    const idgestor = p.idgestor ?? p.prestamo.idgestorAsignado;
    const gestor = gestorRegistro ?? gestorPrestamo;
    const porcentajeUsuario = gestor
      ? decimalToNumber(gestor.porcentajeComision)
      : 0;

    return {
      idpago: p.idpago,
      idprestamo: p.idprestamo,
      monto: decimalToNumber(p.monto),
      noPrestamo: p.prestamo.noPrestamo,
      diasMora: p.prestamo.diasMora,
      idgestor,
      nombreGestor: gestor?.nombre ?? null,
      porcentajeComisionCobrador: resolverComisionDesdeMapa(
        mapaComision,
        idgestor,
        porcentajeUsuario,
      ),
    };
  });
}

export async function simularLiquidacion(
  idmandante: number,
  periodo: string,
  idusuario: number,
): Promise<SimulacionLiquidacion> {
  await requerirAccesoMandante(idusuario, idmandante);
  const { inicio, fin, periodo: p } = parsePeriodo(periodo);

  const [comisionRows, mapaComision] = await Promise.all([
    prisma.tbl_comision_cobro.findMany({
      where: { idmandante, deletedAt: null, estado: true },
    }),
    cargarMapaComisionCobradorMandante(idmandante),
  ]);

  const tramosRecuperacion = mapComisiones(comisionRows);
  const pagos = await cargarPagosPeriodo(
    idmandante,
    inicio,
    fin,
    mapaComision,
  );

  const detalle: DetallePagoLiquidacion[] = pagos.map((pago) => {
    const resultado = calcularComisionPago(
      pago.monto,
      pago.diasMora,
      tramosRecuperacion,
      pago.porcentajeComisionCobrador,
    );
    return {
      idpago: pago.idpago,
      idprestamo: pago.idprestamo,
      noPrestamo: pago.noPrestamo,
      monto: pago.monto,
      diasMora: pago.diasMora,
      idgestor: pago.idgestor,
      nombreGestor: pago.nombreGestor,
      porcentajeRecuperacion: resultado.porcentajeRecuperacion,
      ingresoEmpresa: resultado.ingresoEmpresa,
      porcentajeComisionCobrador: resultado.porcentajeComisionCobrador,
      montoComision: resultado.montoComision,
    };
  });

  const totalRecuperado = roundMoney(
    detalle.reduce((s, d) => s + d.monto, 0),
  );
  const totalIngresoEmpresa = roundMoney(
    detalle.reduce((s, d) => s + d.ingresoEmpresa, 0),
  );
  const totalComision = roundMoney(
    detalle.reduce((s, d) => s + d.montoComision, 0),
  );

  return {
    idmandante,
    periodo: p,
    totalRecuperado,
    totalIngresoEmpresa,
    totalComision,
    cantidadPagos: detalle.length,
    detalle,
  };
}

export async function generarLiquidacion(
  params: GenerarLiquidacionParams,
): Promise<{ idliquidacion: number; simulacion: SimulacionLiquidacion }> {
  const sim = await simularLiquidacion(
    params.idmandante,
    params.periodo,
    params.idusuario,
  );

  const existente = await prisma.tbl_liquidacion.findFirst({
    where: {
      idmandante: params.idmandante,
      periodo: sim.periodo,
      deletedAt: null,
      estado: { in: ['BORRADOR', 'EMITIDA'] },
    },
  });

  if (existente && existente.estado === 'EMITIDA') {
    throw new Error(
      'Ya existe una liquidación emitida para este mandante y periodo.',
    );
  }

  const liquidacion = await prisma.$transaction(async (tx) => {
    const liq = existente
      ? await tx.tbl_liquidacion.update({
          where: { idliquidacion: existente.idliquidacion },
          data: {
            totalRecuperado: sim.totalRecuperado,
            totalComision: sim.totalComision,
            estado: 'BORRADOR',
          },
        })
      : await tx.tbl_liquidacion.create({
          data: {
            idmandante: params.idmandante,
            periodo: sim.periodo,
            totalRecuperado: sim.totalRecuperado,
            totalComision: sim.totalComision,
            estado: 'BORRADOR',
          },
        });

    await tx.tbl_liquidacion_detalle.deleteMany({
      where: { idliquidacion: liq.idliquidacion },
    });

    if (sim.detalle.length > 0) {
      await tx.tbl_liquidacion_detalle.createMany({
        data: sim.detalle.map((d) => ({
          idliquidacion: liq.idliquidacion,
          idpago: d.idpago,
          idprestamo: d.idprestamo,
          noPrestamo: d.noPrestamo,
          monto: d.monto,
          diasMora: d.diasMora,
          idgestor: d.idgestor,
          nombreGestor: d.nombreGestor,
          porcentajeRecuperacion: d.porcentajeRecuperacion,
          ingresoEmpresa: d.ingresoEmpresa,
          porcentajeComisionCobrador: d.porcentajeComisionCobrador,
          montoComision: d.montoComision,
        })),
      });
    }

    return liq;
  });

  return { idliquidacion: liquidacion.idliquidacion, simulacion: sim };
}

export async function emitirLiquidacion(
  idliquidacion: number,
  idusuario: number,
): Promise<void> {
  const liq = await prisma.tbl_liquidacion.findUnique({
    where: { idliquidacion },
  });
  if (!liq || liq.deletedAt) {
    throw new Error('Liquidación no encontrada.');
  }
  await requerirAccesoMandante(idusuario, liq.idmandante);
  if (liq.estado !== 'BORRADOR') {
    throw new Error('Solo se pueden emitir liquidaciones en estado BORRADOR.');
  }
  await prisma.tbl_liquidacion.update({
    where: { idliquidacion },
    data: { estado: 'EMITIDA' },
  });
}

export async function marcarLiquidacionPagada(
  idliquidacion: number,
  idusuario: number,
): Promise<void> {
  const liq = await prisma.tbl_liquidacion.findUnique({
    where: { idliquidacion },
  });
  if (!liq || liq.deletedAt) {
    throw new Error('Liquidación no encontrada.');
  }
  await requerirAccesoMandante(idusuario, liq.idmandante);
  if (liq.estado !== 'EMITIDA') {
    throw new Error('Solo se pueden pagar liquidaciones emitidas.');
  }
  await prisma.tbl_liquidacion.update({
    where: { idliquidacion },
    data: { estado: 'PAGADA' },
  });
}

export async function obtenerDetalleLiquidacion(
  idliquidacion: number,
  idusuario: number,
): Promise<DetallePagoLiquidacion[]> {
  const liq = await prisma.tbl_liquidacion.findUnique({
    where: { idliquidacion },
  });
  if (!liq || liq.deletedAt) {
    throw new Error('Liquidación no encontrada.');
  }
  await requerirAccesoMandante(idusuario, liq.idmandante);

  const rows = await prisma.tbl_liquidacion_detalle.findMany({
    where: { idliquidacion },
    orderBy: { iddetalle: 'asc' },
  });

  return rows.map((r) => ({
    idpago: r.idpago,
    idprestamo: r.idprestamo,
    noPrestamo: r.noPrestamo,
    monto: decimalToNumber(r.monto),
    diasMora: r.diasMora,
    idgestor: r.idgestor,
    nombreGestor: r.nombreGestor,
    porcentajeRecuperacion: decimalToNumber(r.porcentajeRecuperacion),
    ingresoEmpresa: decimalToNumber(r.ingresoEmpresa),
    porcentajeComisionCobrador: decimalToNumber(r.porcentajeComisionCobrador),
    montoComision: decimalToNumber(r.montoComision),
  }));
}
