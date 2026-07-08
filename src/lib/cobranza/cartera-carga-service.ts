import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { registrarAuditoria } from '@/lib/cobranza/auditoria-service';
import { decimalToNumber } from '@/lib/cobranza/decimal-utils';
import {
  estadoParaPrestamoAusente,
  obtenerAccionPrestamosAusentes,
} from '@/lib/cobranza/cartera-carga-config';

export interface DetallePrestamoCarga {
  idprestamo: number;
  noPrestamo: string;
  esNuevo: boolean;
  saldoAnterior: number | null;
  saldoNuevo: number;
}

export interface ResumenComparacionCarga {
  prestamosNuevos: string[];
  prestamosSaldoCambiado: Array<{
    noPrestamo: string;
    saldoAnterior: number;
    saldoNuevo: number;
  }>;
  prestamosFechaCorteCambiada: string[];
  prestamosAusentes: string[];
  prestamosConErrores: Array<{ fila: number; mensaje: string }>;
}

export interface FinalizarCargaParams {
  idcarga: number;
  idmandante: number;
  idcampana: number;
  idusuario: number;
  nombreArchivo: string;
  fechaCorte: Date;
  tiempoMs: number;
  totalProcesados: number;
  prestamosNuevos: number;
  prestamosActualizados: number;
  prestamosSaldoCambiado: number;
  prestamosErrores: number;
  saldoTotal: number;
  prestamosAusentes: number;
  detallePrestamos: DetallePrestamoCarga[];
  errores: Array<{ fila: number; mensaje: string }>;
  prestamosEnArchivo: Set<string>;
}

export async function iniciarCargaCartera(
  idmandante: number,
  idcampana: number,
  idusuario: number,
  nombreArchivo: string,
  fechaCorte: Date,
): Promise<number> {
  await requerirAccesoMandante(idusuario, idmandante);

  const carga = await prisma.$transaction(async (tx) => {
    await desactivarCargasAnteriores(tx, idmandante);
    await desactivarCampanasAnteriores(tx, idmandante, idcampana);

    return tx.tbl_carga_cartera.create({
      data: {
        idmandante,
        idcampana,
        idusuario,
        nombreArchivo,
        fechaCorte,
        estado: 'VIGENTE',
      },
    });
  });

  return carga.idcarga;
}

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function desactivarCampanasAnteriores(
  db: DbClient,
  idmandante: number,
  idcampanaActual: number,
): Promise<void> {
  await db.tbl_campana.updateMany({
    where: {
      idmandante,
      idcampana: { not: idcampanaActual },
      estado: 'ACTIVA',
      deletedAt: null,
    },
    data: { estado: 'INACTIVA' },
  });

  await db.tbl_campana.update({
    where: { idcampana: idcampanaActual },
    data: { estado: 'ACTIVA' },
  });
}

export async function desactivarCargasAnteriores(
  db: DbClient,
  idmandante: number,
): Promise<void> {
  await db.tbl_carga_cartera.updateMany({
    where: { idmandante, estado: 'VIGENTE' },
    data: { estado: 'INACTIVA' },
  });
}

function construirResumenComparacion(
  detallePrestamos: DetallePrestamoCarga[],
  prestamosAusentes: string[],
  errores: Array<{ fila: number; mensaje: string }>,
  _fechaCorte: Date,
): ResumenComparacionCarga {
  const prestamosNuevos = detallePrestamos
    .filter((p) => p.esNuevo)
    .map((p) => p.noPrestamo);

  const prestamosSaldoCambiado = detallePrestamos
    .filter(
      (p) =>
        !p.esNuevo &&
        p.saldoAnterior !== null &&
        Math.abs(p.saldoAnterior - p.saldoNuevo) > 0.009,
    )
    .map((p) => ({
      noPrestamo: p.noPrestamo,
      saldoAnterior: p.saldoAnterior ?? 0,
      saldoNuevo: p.saldoNuevo,
    }));

  const prestamosFechaCorteCambiada = detallePrestamos
    .filter((p) => !p.esNuevo)
    .map((p) => p.noPrestamo);

  return {
    prestamosNuevos,
    prestamosSaldoCambiado,
    prestamosFechaCorteCambiada,
    prestamosAusentes,
    prestamosConErrores: errores,
  };
}

export async function aplicarAccionPrestamosAusentes(
  db: DbClient,
  idmandante: number,
  prestamosEnArchivo: Set<string>,
  idusuario: number,
  idcarga: number,
): Promise<number> {
  const accion = await obtenerAccionPrestamosAusentes();
  const nuevoEstado = estadoParaPrestamoAusente(accion);

  if (!nuevoEstado) {
    return 0;
  }

  const ausentes = await db.tbl_prestamo.findMany({
    where: {
      idmandante,
      deletedAt: null,
      estado: { notIn: ['Cancelado', 'Finalizado', nuevoEstado] },
    },
    select: { idprestamo: true, noPrestamo: true, estado: true },
  });

  const aActualizar = ausentes.filter((p) => !prestamosEnArchivo.has(p.noPrestamo));
  if (aActualizar.length === 0) {
    return 0;
  }

  await db.tbl_prestamo.updateMany({
    where: { idprestamo: { in: aActualizar.map((p) => p.idprestamo) } },
    data: { estado: nuevoEstado },
  });

  for (const prestamo of aActualizar) {
    await registrarAuditoria(db, {
      idusuario,
      entidad: 'prestamo',
      entidadId: prestamo.idprestamo,
      accion: 'prestamo_ausente_importacion',
      detalle: JSON.stringify({
        idcarga,
        noPrestamo: prestamo.noPrestamo,
        estadoAnterior: prestamo.estado,
        estadoNuevo: nuevoEstado,
        accion,
      }),
    });
  }

  return aActualizar.length;
}

export async function finalizarCargaCartera(
  params: FinalizarCargaParams,
): Promise<{ idcarga: number; resumenDiff: ResumenComparacionCarga }> {
  await requerirAccesoMandante(params.idusuario, params.idmandante);

  const prestamosAusentesNombres = await prisma.tbl_prestamo.findMany({
    where: {
      idmandante: params.idmandante,
      deletedAt: null,
      estado: { notIn: ['Cancelado', 'Finalizado'] },
    },
    select: { noPrestamo: true },
  });

  const ausentes = prestamosAusentesNombres
    .map((p) => p.noPrestamo)
    .filter((no) => !params.prestamosEnArchivo.has(no));

  const resumenDiff = construirResumenComparacion(
    params.detallePrestamos,
    ausentes,
    params.errores,
    params.fechaCorte,
  );

  await prisma.$transaction(async (tx) => {
    await tx.tbl_carga_cartera.update({
      where: { idcarga: params.idcarga },
      data: {
        totalPrestamos: params.totalProcesados,
        prestamosNuevos: params.prestamosNuevos,
        prestamosActualizados: params.prestamosActualizados,
        prestamosSaldoCambiado: params.prestamosSaldoCambiado,
        prestamosErrores: params.prestamosErrores,
        prestamosAusentes: params.prestamosAusentes,
        saldoTotal: params.saldoTotal,
        tiempoMs: params.tiempoMs,
        resumenDiff: JSON.stringify(resumenDiff),
        detalleCarga: JSON.stringify(params.detallePrestamos),
      },
    });

    await aplicarAccionPrestamosAusentes(
      tx,
      params.idmandante,
      params.prestamosEnArchivo,
      params.idusuario,
      params.idcarga,
    );
  });

  await registrarAuditoria(prisma, {
    idusuario: params.idusuario,
    entidad: 'carga_cartera',
    entidadId: params.idcarga,
    accion: 'importacion',
    detalle: JSON.stringify({
      idmandante: params.idmandante,
      idcampana: params.idcampana,
      nombreArchivo: params.nombreArchivo,
      resumen: resumenDiff,
    }).slice(0, 3500),
  });

  return { idcarga: params.idcarga, resumenDiff };
}

export async function listarCargasCartera(
  idusuario: number,
  idmandante: number,
  page = 1,
  pageSize = 20,
): Promise<{
  cargas: Array<{
    idcarga: number;
    nombreArchivo: string;
    fechaCorte: Date;
    estado: string;
    totalPrestamos: number;
    saldoTotal: number;
    tiempoMs: number | null;
    createdAt: Date;
    usuario: { nombre: string } | null;
  }>;
  total: number;
}> {
  await requerirAccesoMandante(idusuario, idmandante);

  const where: Prisma.tbl_carga_carteraWhereInput = { idmandante };
  const skip = (page - 1) * pageSize;

  const [cargas, total] = await Promise.all([
    prisma.tbl_carga_cartera.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        usuario: { select: { nombre: true } },
      },
    }),
    prisma.tbl_carga_cartera.count({ where }),
  ]);

  return {
    cargas: cargas.map((c) => ({
      idcarga: c.idcarga,
      nombreArchivo: c.nombreArchivo,
      fechaCorte: c.fechaCorte,
      estado: c.estado,
      totalPrestamos: c.totalPrestamos,
      saldoTotal: decimalToNumber(c.saldoTotal),
      tiempoMs: c.tiempoMs,
      createdAt: c.createdAt,
      usuario: c.usuario,
    })),
    total,
  };
}

export async function obtenerResumenCarga(
  idusuario: number,
  idcarga: number,
): Promise<ResumenComparacionCarga | null> {
  const carga = await prisma.tbl_carga_cartera.findUnique({
    where: { idcarga },
    select: { idmandante: true, resumenDiff: true },
  });

  if (!carga) {
    return null;
  }

  await requerirAccesoMandante(idusuario, carga.idmandante);

  if (!carga.resumenDiff) {
    return null;
  }

  return JSON.parse(carga.resumenDiff) as ResumenComparacionCarga;
}

export async function revertirUltimaCarga(
  idusuario: number,
  idmandante: number,
  motivo: string,
): Promise<{ idcarga: number }> {
  await requerirAccesoMandante(idusuario, idmandante);

  const cargaVigente = await prisma.tbl_carga_cartera.findFirst({
    where: { idmandante, estado: 'VIGENTE' },
    orderBy: { createdAt: 'desc' },
  });

  if (!cargaVigente) {
    throw new Error('No hay carga vigente para revertir.');
  }

  const pagosPosteriores = await prisma.tbl_pago.count({
    where: {
      idmandante,
      createdAt: { gt: cargaVigente.createdAt },
    },
  });

  if (pagosPosteriores > 0) {
    throw new Error(
      'No se puede revertir: existen pagos registrados después de la carga.',
    );
  }

  const detalle: DetallePrestamoCarga[] = cargaVigente.detalleCarga
    ? (JSON.parse(cargaVigente.detalleCarga) as DetallePrestamoCarga[])
    : [];

  await prisma.$transaction(async (tx) => {
    for (const item of detalle) {
      if (item.esNuevo) {
        await tx.tbl_prestamo.update({
          where: { idprestamo: item.idprestamo },
          data: { deletedAt: new Date() },
        });
      } else if (item.saldoAnterior !== null) {
        await tx.tbl_prestamo.update({
          where: { idprestamo: item.idprestamo },
          data: { saldoTotal: item.saldoAnterior },
        });
      }
    }

    await tx.tbl_prestamo_corte.deleteMany({
      where: { idcarga: cargaVigente.idcarga },
    });

    await tx.tbl_carga_cartera.update({
      where: { idcarga: cargaVigente.idcarga },
      data: {
        estado: 'REVERTIDA',
        motivoReversion: motivo,
        idusuarioReversion: idusuario,
        fechaReversion: new Date(),
      },
    });

    const cargaAnterior = await tx.tbl_carga_cartera.findFirst({
      where: {
        idmandante,
        estado: 'INACTIVA',
        idcarga: { not: cargaVigente.idcarga },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (cargaAnterior) {
      await tx.tbl_carga_cartera.update({
        where: { idcarga: cargaAnterior.idcarga },
        data: { estado: 'VIGENTE' },
      });
      await tx.tbl_campana.update({
        where: { idcampana: cargaAnterior.idcampana },
        data: { estado: 'ACTIVA' },
      });
    }

    await tx.tbl_campana.update({
      where: { idcampana: cargaVigente.idcampana },
      data: { estado: 'INACTIVA' },
    });
  });

  await registrarAuditoria(prisma, {
    idusuario,
    entidad: 'carga_cartera',
    entidadId: cargaVigente.idcarga,
    accion: 'reversion',
    detalle: JSON.stringify({ idmandante, motivo }),
  });

  return { idcarga: cargaVigente.idcarga };
}
