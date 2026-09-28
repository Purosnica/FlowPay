import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { registrarAuditoria } from './auditoria-service';
import {
  normalizarReferenciaBancaria,
  resolverMatchingBancario,
  type CandidatoConciliacion,
} from './conciliacion-matching';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export type LineaExtractoInput = {
  fechaOperacion: Date;
  fechaValor?: Date | null;
  referencia?: string | null;
  descripcion?: string | null;
  debito?: Prisma.Decimal.Value;
  credito?: Prisma.Decimal.Value;
  monto: Prisma.Decimal.Value;
  moneda: string;
};

export type CrearExtractoInput = {
  idmandante: number;
  institucionFinanciera: string;
  cuenta: string;
  moneda: string;
  fechaDesde: Date;
  fechaHasta: Date;
  archivoNombre: string;
  archivoHash?: string;
  lineas: LineaExtractoInput[];
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function fingerprintLinea(idmandante: number, input: LineaExtractoInput): string {
  return sha256([
    idmandante,
    input.fechaOperacion.toISOString(),
    normalizarReferenciaBancaria(input.referencia) ?? '',
    new Prisma.Decimal(input.monto).toFixed(2),
    input.moneda.trim().toUpperCase(),
    input.descripcion?.trim() ?? '',
  ].join('|'));
}

export async function crearExtractoBancario(
  idusuario: number,
  input: CrearExtractoInput,
) {
  await requerirAccesoMandante(idusuario, input.idmandante);
  if (!input.lineas.length) {
    throw new GraphQLValidationError('El extracto debe contener al menos una línea.');
  }

  const archivoHash = input.archivoHash ?? sha256(JSON.stringify({
    idmandante: input.idmandante,
    cuenta: input.cuenta,
    fechaDesde: input.fechaDesde,
    fechaHasta: input.fechaHasta,
    lineas: input.lineas.map((l) => ({
      fechaOperacion: l.fechaOperacion,
      referencia: l.referencia ?? null,
      monto: new Prisma.Decimal(l.monto).toFixed(2),
      moneda: l.moneda,
    })),
  }));

  return prisma.$transaction(async (tx) => {
    const duplicado = await tx.tbl_extracto_bancario.findFirst({
      where: { idmandante: input.idmandante, archivoHash },
      select: { idextracto: true },
    });
    if (duplicado) {
      throw new GraphQLValidationError(
        `El extracto ya fue cargado (ID ${duplicado.idextracto}).`,
      );
    }

    const extracto = await tx.tbl_extracto_bancario.create({
      data: {
        idmandante: input.idmandante,
        institucionFinanciera: input.institucionFinanciera.trim(),
        cuenta: input.cuenta.trim(),
        moneda: input.moneda.trim().toUpperCase(),
        fechaDesde: input.fechaDesde,
        fechaHasta: input.fechaHasta,
        archivoNombre: input.archivoNombre.trim(),
        archivoHash,
        creadoPor: idusuario,
      },
    });

    for (const linea of input.lineas) {
      const moneda = linea.moneda.trim().toUpperCase();
      const monto = new Prisma.Decimal(linea.monto);
      if (monto.lte(0)) {
        throw new GraphQLValidationError('Cada línea debe tener monto mayor que cero.');
      }
      if (moneda !== extracto.moneda) {
        throw new GraphQLValidationError(
          'La moneda de cada línea debe coincidir con la moneda del extracto.',
        );
      }
      await tx.tbl_extracto_linea.create({
        data: {
          idextracto: extracto.idextracto,
          fechaOperacion: linea.fechaOperacion,
          fechaValor: linea.fechaValor ?? null,
          referenciaOriginal: linea.referencia?.trim() || null,
          referenciaNormalizada: normalizarReferenciaBancaria(linea.referencia),
          descripcion: linea.descripcion?.trim() || null,
          debito: linea.debito ?? 0,
          credito: linea.credito ?? 0,
          monto,
          moneda,
          fingerprint: fingerprintLinea(input.idmandante, linea),
          estado: 'PENDIENTE',
        },
      });
    }

    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'tbl_extracto_bancario',
      entidadId: extracto.idextracto,
      accion: 'CREATE',
      detalle: JSON.stringify({
        idmandante: input.idmandante,
        archivoNombre: input.archivoNombre,
        archivoHash,
        lineas: input.lineas.length,
      }),
    });

    return tx.tbl_extracto_bancario.findUniqueOrThrow({
      where: { idextracto: extracto.idextracto },
      include: { lineas: true },
    });
  });
}

export async function listarExtractosBancarios(
  idusuario: number,
  idmandante: number,
) {
  await requerirAccesoMandante(idusuario, idmandante);
  return prisma.tbl_extracto_bancario.findMany({
    where: { idmandante },
    orderBy: { createdAt: 'desc' },
    include: { lineas: { select: { estado: true } } },
  });
}

export async function obtenerLineasExtracto(
  idusuario: number,
  idextracto: number,
  estado?: string | null,
) {
  const extracto = await prisma.tbl_extracto_bancario.findUnique({
    where: { idextracto },
    select: { idmandante: true },
  });
  if (!extracto) throw new GraphQLValidationError('Extracto no encontrado.');
  await requerirAccesoMandante(idusuario, extracto.idmandante);

  return prisma.tbl_extracto_linea.findMany({
    where: {
      idextracto,
      ...(estado ? { estado } : {}),
    },
    orderBy: [{ fechaOperacion: 'desc' }, { idlinea: 'desc' }],
    include: { conciliaciones: true },
  });
}

export async function resumenConciliacion(
  idusuario: number,
  idextracto: number,
) {
  const extracto = await prisma.tbl_extracto_bancario.findUnique({
    where: { idextracto },
    select: { idmandante: true },
  });
  if (!extracto) throw new GraphQLValidationError('Extracto no encontrado.');
  await requerirAccesoMandante(idusuario, extracto.idmandante);

  const grupos = await prisma.tbl_extracto_linea.groupBy({
    by: ['estado'],
    where: { idextracto },
    _count: { _all: true },
  });
  const counts = new Map(grupos.map((g) => [g.estado, g._count._all]));
  const total = grupos.reduce((acc, g) => acc + g._count._all, 0);
  return {
    total,
    pendientes: counts.get('PENDIENTE') ?? 0,
    conciliadas: counts.get('CONCILIADO') ?? 0,
    ambiguas: counts.get('AMBIGUO') ?? 0,
    sinCoincidencia: counts.get('SIN_COINCIDENCIA') ?? 0,
    duplicadas: counts.get('DUPLICADO') ?? 0,
    excluidas: counts.get('EXCLUIDO') ?? 0,
  };
}

async function cargarCandidatos(
  client: PrismaClientLike,
  idmandante: number,
  linea: { fechaOperacion: Date; monto: Prisma.Decimal; moneda: string },
): Promise<CandidatoConciliacion[]> {
  const desde = new Date(linea.fechaOperacion.getTime() - 86_400_000);
  const hasta = new Date(linea.fechaOperacion.getTime() + 86_400_000);
  const pagos = await client.tbl_pago.findMany({
    where: {
      idmandante,
      deletedAt: null,
      fechaPago: { gte: desde, lte: hasta },
      moneda: linea.moneda,
      monto: linea.monto,
    },
    select: {
      idpago: true,
      fechaPago: true,
      monto: true,
      moneda: true,
      folio: true,
      idempotencyKey: true,
      sourceFingerprint: true,
    },
  });
  return pagos.map((p) => ({
    idpago: p.idpago,
    fechaPago: p.fechaPago,
    monto: p.monto.toNumber(),
    moneda: p.moneda,
    referencia: p.folio ?? p.idempotencyKey ?? p.sourceFingerprint,
  }));
}

export async function ejecutarMatchingExtracto(
  idusuario: number,
  idextracto: number,
) {
  const extracto = await prisma.tbl_extracto_bancario.findUnique({
    where: { idextracto },
    select: { idmandante: true },
  });
  if (!extracto) throw new GraphQLValidationError('Extracto no encontrado.');
  await requerirAccesoMandante(idusuario, extracto.idmandante);

  const lineas = await prisma.tbl_extracto_linea.findMany({
    where: { idextracto, estado: { in: ['PENDIENTE', 'AMBIGUO', 'SIN_COINCIDENCIA'] } },
  });

  const resultado = { conciliadas: 0, ambiguas: 0, sinCoincidencia: 0 };

  for (const linea of lineas) {
    await prisma.$transaction(async (tx) => {
      const vigente = await tx.tbl_extracto_linea.findUnique({
        where: { idlinea: linea.idlinea },
      });
      if (!vigente || vigente.estado === 'CONCILIADO' || vigente.estado === 'EXCLUIDO') return;

      const candidatos = await cargarCandidatos(tx, extracto.idmandante, vigente);
      const match = resolverMatchingBancario({
        referencia: vigente.referenciaOriginal,
        monto: vigente.monto.toNumber(),
        moneda: vigente.moneda,
        fechaOperacion: vigente.fechaOperacion,
      }, candidatos);

      if (match.estado === 'MATCH_EXACT' || match.estado === 'MATCH_PROBABLE') {
        const pago = await tx.tbl_pago.findUnique({
          where: { idpago: match.candidato.idpago },
          select: { idmandante: true, deletedAt: true },
        });
        if (!pago || pago.deletedAt || pago.idmandante !== extracto.idmandante) {
          throw new GraphQLValidationError('El pago candidato no pertenece al mismo mandante.');
        }

        const activa = await tx.tbl_conciliacion_pago.findFirst({
          where: { idlinea: vigente.idlinea, estado: 'CONCILIADO' },
        });
        if (activa) return;

        await tx.tbl_conciliacion_pago.create({
          data: {
            idlinea: vigente.idlinea,
            idpago: match.candidato.idpago,
            lineaActiva: vigente.idlinea,
            pagoActivo: match.candidato.idpago,
            estado: 'CONCILIADO',
            metodoMatch: match.metodo,
            confidence: new Prisma.Decimal(match.confidence),
            conciliadoPor: idusuario,
          },
        });
        await tx.tbl_extracto_linea.update({
          where: { idlinea: vigente.idlinea },
          data: { estado: 'CONCILIADO' },
        });
        resultado.conciliadas += 1;
      } else {
        const estado = match.estado === 'AMBIGUO' ? 'AMBIGUO' : 'SIN_COINCIDENCIA';
        await tx.tbl_extracto_linea.update({
          where: { idlinea: vigente.idlinea },
          data: { estado },
        });
        if (estado === 'AMBIGUO') resultado.ambiguas += 1;
        else resultado.sinCoincidencia += 1;
      }
    });
  }

  return resultado;
}

export async function conciliarLineaManual(
  idusuario: number,
  idlinea: number,
  idpago: number,
  motivo: string,
) {
  const motivoLimpio = motivo.trim();
  if (motivoLimpio.length < 5) {
    throw new GraphQLValidationError('Debe indicar un motivo de conciliación manual.');
  }

  return prisma.$transaction(async (tx) => {
    const linea = await tx.tbl_extracto_linea.findUnique({
      where: { idlinea },
      include: { extracto: true },
    });
    if (!linea) throw new GraphQLValidationError('Línea de extracto no encontrada.');
    await requerirAccesoMandante(idusuario, linea.extracto.idmandante);
    if (linea.estado === 'CONCILIADO') {
      throw new GraphQLValidationError('La línea ya está conciliada.');
    }
    if (linea.estado === 'EXCLUIDO') {
      throw new GraphQLValidationError('Una línea excluida no puede conciliarse.');
    }

    const pago = await tx.tbl_pago.findUnique({ where: { idpago } });
    if (!pago || pago.deletedAt) throw new GraphQLValidationError('Pago no encontrado.');
    if (pago.idmandante !== linea.extracto.idmandante) {
      throw new GraphQLValidationError('El pago pertenece a otro mandante.');
    }

    const otra = await tx.tbl_conciliacion_pago.findFirst({
      where: {
        idpago,
        estado: 'CONCILIADO',
        linea: { idextracto: linea.idextracto },
      },
    });
    if (otra) {
      throw new GraphQLValidationError('El pago ya está conciliado con otra línea de este extracto.');
    }

    const conciliacion = await tx.tbl_conciliacion_pago.create({
      data: {
        idlinea,
        idpago,
        lineaActiva: idlinea,
        pagoActivo: idpago,
        estado: 'CONCILIADO',
        metodoMatch: 'MANUAL',
        confidence: new Prisma.Decimal(100),
        conciliadoPor: idusuario,
        motivoOverride: motivoLimpio,
      },
    });
    await tx.tbl_extracto_linea.update({
      where: { idlinea },
      data: { estado: 'CONCILIADO' },
    });
    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'tbl_conciliacion_pago',
      entidadId: conciliacion.idconciliacion,
      accion: 'CONCILIAR_MANUAL',
      detalle: JSON.stringify({ idlinea, idpago, motivo: motivoLimpio }),
    });
    return conciliacion;
  });
}

export async function desconciliarLinea(
  idusuario: number,
  idlinea: number,
  motivo: string,
) {
  const motivoLimpio = motivo.trim();
  if (motivoLimpio.length < 5) {
    throw new GraphQLValidationError('Debe indicar el motivo de la desconciliación.');
  }

  return prisma.$transaction(async (tx) => {
    const linea = await tx.tbl_extracto_linea.findUnique({
      where: { idlinea },
      include: { extracto: true },
    });
    if (!linea) throw new GraphQLValidationError('Línea de extracto no encontrada.');
    await requerirAccesoMandante(idusuario, linea.extracto.idmandante);

    const conciliacion = await tx.tbl_conciliacion_pago.findFirst({
      where: { idlinea, estado: 'CONCILIADO' },
      orderBy: { conciliadoAt: 'desc' },
    });
    if (!conciliacion) {
      throw new GraphQLValidationError('La línea no tiene una conciliación activa.');
    }

    await tx.tbl_conciliacion_pago.update({
      where: { idconciliacion: conciliacion.idconciliacion },
      data: {
        estado: 'DESCONCILIADO',
        lineaActiva: null,
        pagoActivo: null,
        desconciliadoPor: idusuario,
        desconciliadoAt: new Date(),
        motivoDesconciliacion: motivoLimpio,
      },
    });
    await tx.tbl_extracto_linea.update({
      where: { idlinea },
      data: { estado: 'PENDIENTE' },
    });
    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'tbl_conciliacion_pago',
      entidadId: conciliacion.idconciliacion,
      accion: 'DESCONCILIAR',
      detalle: JSON.stringify({ idlinea, idpago: conciliacion.idpago, motivo: motivoLimpio }),
    });
    return true;
  });
}

export async function excluirLinea(
  idusuario: number,
  idlinea: number,
  motivo: string,
) {
  const motivoLimpio = motivo.trim();
  if (motivoLimpio.length < 5) {
    throw new GraphQLValidationError('Debe indicar el motivo de exclusión.');
  }
  return prisma.$transaction(async (tx) => {
    const linea = await tx.tbl_extracto_linea.findUnique({
      where: { idlinea },
      include: { extracto: true },
    });
    if (!linea) throw new GraphQLValidationError('Línea de extracto no encontrada.');
    await requerirAccesoMandante(idusuario, linea.extracto.idmandante);
    if (linea.estado === 'CONCILIADO') {
      throw new GraphQLValidationError('Desconcilie la línea antes de excluirla.');
    }
    await tx.tbl_extracto_linea.update({
      where: { idlinea },
      data: { estado: 'EXCLUIDO' },
    });
    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'tbl_extracto_linea',
      entidadId: idlinea,
      accion: 'EXCLUIR_CONCILIACION',
      detalle: JSON.stringify({ motivo: motivoLimpio }),
    });
    return true;
  });
}
