import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { registrarAuditoria } from './auditoria-service';
import { inicioDiaNegocio, finDiaEnZona, TZ_NEGOCIO } from '@/lib/utils/timezone';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';

export const MEDIOS_CIERRE = ['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'CHEQUE', 'TARJETA', 'OTRO'] as const;
export type MedioCierre = (typeof MEDIOS_CIERRE)[number];

function normalizarMedio(medio: string | null): MedioCierre {
  const valor = (medio ?? 'OTRO').toUpperCase();
  return (MEDIOS_CIERRE as readonly string[]).includes(valor)
    ? (valor as MedioCierre)
    : 'OTRO';
}

export async function calcularTotalesSistemaCierre(input: {
  idmandante: number;
  fechaNegocio: Date;
  idagencia?: number | null;
  idusuarioCaja?: number | null;
}) {
  const desde = inicioDiaNegocio(input.fechaNegocio);
  const hasta = finDiaEnZona(input.fechaNegocio, TZ_NEGOCIO);

  const pagos = await prisma.tbl_pago.findMany({
    where: {
      idmandante: input.idmandante,
      deletedAt: null,
      aplicado: true,
      fechaPago: { gte: desde, lt: hasta },
      ...(input.idusuarioCaja != null ? { idgestor: input.idusuarioCaja } : {}),
      ...(input.idagencia != null
        ? { prestamo: { idagencia: input.idagencia, deletedAt: null } }
        : {}),
    },
    select: { monto: true, medio: true },
  });

  const porMedio = new Map<MedioCierre, Prisma.Decimal>();
  for (const medio of MEDIOS_CIERRE) porMedio.set(medio, new Prisma.Decimal(0));
  for (const pago of pagos) {
    const medio = normalizarMedio(pago.medio);
    porMedio.set(medio, (porMedio.get(medio) ?? new Prisma.Decimal(0)).plus(pago.monto));
  }

  let total = new Prisma.Decimal(0);
  const detalles = MEDIOS_CIERRE.map((medio) => {
    const montoSistema = porMedio.get(medio) ?? new Prisma.Decimal(0);
    total = total.plus(montoSistema);
    return { medio, montoSistema };
  });

  return { totalSistema: total, detalles, desde, hasta };
}

export async function crearCierreDiario(
  idusuario: number,
  input: {
    idmandante: number;
    fechaNegocio: Date;
    idagencia?: number | null;
    idusuarioCaja?: number | null;
  },
) {
  await requerirAccesoMandante(idusuario, input.idmandante);
  const fechaNegocio = inicioDiaNegocio(input.fechaNegocio);

  const existente = await prisma.tbl_cierre_diario.findFirst({
    where: {
      idmandante: input.idmandante,
      fechaNegocio,
      idagencia: input.idagencia ?? null,
      idusuarioCaja: input.idusuarioCaja ?? null,
    },
    include: { detalles: true },
  });
  if (existente) return existente;

  const totales = await calcularTotalesSistemaCierre({ ...input, fechaNegocio });

  return prisma.$transaction(async (tx) => {
    const cierre = await tx.tbl_cierre_diario.create({
      data: {
        idmandante: input.idmandante,
        fechaNegocio,
        idagencia: input.idagencia ?? null,
        idusuarioCaja: input.idusuarioCaja ?? null,
        estado: 'ABIERTO',
        totalSistema: totales.totalSistema,
        totalDeclarado: new Prisma.Decimal(0),
        diferencia: totales.totalSistema.negated(),
        creadoPor: idusuario,
        detalles: {
          create: totales.detalles.map((d) => ({
            medio: d.medio,
            montoSistema: d.montoSistema,
            montoDeclarado: new Prisma.Decimal(0),
            diferencia: d.montoSistema.negated(),
          })),
        },
      },
      include: { detalles: true },
    });

    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'tbl_cierre_diario',
      entidadId: cierre.idcierre,
      accion: 'CREATE',
      detalle: JSON.stringify({
        idmandante: input.idmandante,
        fechaNegocio: fechaNegocio.toISOString(),
        idagencia: input.idagencia ?? null,
        idusuarioCaja: input.idusuarioCaja ?? null,
        totalSistema: totales.totalSistema.toString(),
      }),
    });
    return cierre;
  });
}

export async function guardarDeclaracionCierre(
  idusuario: number,
  idcierre: number,
  declarados: Array<{ medio: string; montoDeclarado: string | number }>,
) {
  const cierre = await prisma.tbl_cierre_diario.findUnique({
    where: { idcierre },
    include: { detalles: true },
  });
  if (!cierre) throw new GraphQLValidationError('Cierre diario no encontrado.');
  await requerirAccesoMandante(idusuario, cierre.idmandante);
  if (!['ABIERTO', 'REABIERTO'].includes(cierre.estado)) {
    throw new GraphQLValidationError('El cierre no admite modificaciones en su estado actual.');
  }

  const mapa = new Map<string, Prisma.Decimal>();
  for (const d of declarados) {
    const medio = normalizarMedio(d.medio);
    const monto = new Prisma.Decimal(d.montoDeclarado);
    if (monto.isNegative()) throw new GraphQLValidationError('Los montos declarados no pueden ser negativos.');
    mapa.set(medio, monto);
  }

  const totales = await calcularTotalesSistemaCierre({
    idmandante: cierre.idmandante,
    fechaNegocio: cierre.fechaNegocio,
    idagencia: cierre.idagencia,
    idusuarioCaja: cierre.idusuarioCaja,
  });

  return prisma.$transaction(async (tx) => {
    let totalDeclarado = new Prisma.Decimal(0);
    for (const sistema of totales.detalles) {
      const declarado = mapa.get(sistema.medio) ?? new Prisma.Decimal(0);
      totalDeclarado = totalDeclarado.plus(declarado);
      await tx.tbl_cierre_diario_detalle.upsert({
        where: { idcierre_medio: { idcierre, medio: sistema.medio } },
        create: {
          idcierre,
          medio: sistema.medio,
          montoSistema: sistema.montoSistema,
          montoDeclarado: declarado,
          diferencia: declarado.minus(sistema.montoSistema),
        },
        update: {
          montoSistema: sistema.montoSistema,
          montoDeclarado: declarado,
          diferencia: declarado.minus(sistema.montoSistema),
        },
      });
    }

    const updated = await tx.tbl_cierre_diario.update({
      where: { idcierre },
      data: {
        totalSistema: totales.totalSistema,
        totalDeclarado,
        diferencia: totalDeclarado.minus(totales.totalSistema),
      },
      include: { detalles: true },
    });

    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'tbl_cierre_diario',
      entidadId: idcierre,
      accion: 'UPDATE_DECLARACION',
      detalle: JSON.stringify({
        totalSistema: totales.totalSistema.toString(),
        totalDeclarado: totalDeclarado.toString(),
        diferencia: totalDeclarado.minus(totales.totalSistema).toString(),
      }),
    });
    return updated;
  });
}

export async function enviarCierreRevision(idusuario: number, idcierre: number) {
  const cierre = await prisma.tbl_cierre_diario.findUnique({ where: { idcierre } });
  if (!cierre) throw new GraphQLValidationError('Cierre diario no encontrado.');
  await requerirAccesoMandante(idusuario, cierre.idmandante);
  if (!['ABIERTO', 'REABIERTO'].includes(cierre.estado)) {
    throw new GraphQLValidationError('Solo un cierre abierto o reabierto puede enviarse a revisión.');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.tbl_cierre_diario.update({
      where: { idcierre },
      data: { estado: 'PENDIENTE_REVISION' },
      include: { detalles: true },
    });
    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'tbl_cierre_diario',
      entidadId: idcierre,
      accion: 'ENVIAR_REVISION',
    });
    return updated;
  });
}

export async function cerrarCierreDiario(idusuario: number, idcierre: number) {
  const cierre = await prisma.tbl_cierre_diario.findUnique({ where: { idcierre } });
  if (!cierre) throw new GraphQLValidationError('Cierre diario no encontrado.');
  await requerirAccesoMandante(idusuario, cierre.idmandante);
  if (cierre.estado !== 'PENDIENTE_REVISION') {
    throw new GraphQLValidationError('El cierre debe estar pendiente de revisión para poder cerrarse.');
  }
  if (cierre.creadoPor === idusuario) {
    throw new GraphQLValidationError(
      'El usuario que creó el cierre no puede aprobar su propio cierre.',
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.tbl_cierre_diario.update({
      where: { idcierre },
      data: {
        estado: 'CERRADO',
        revisadoPor: idusuario,
        cerradoPor: idusuario,
        closedAt: new Date(),
      },
      include: { detalles: true },
    });
    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'tbl_cierre_diario',
      entidadId: idcierre,
      accion: 'CERRAR',
      detalle: JSON.stringify({ diferencia: cierre.diferencia.toString() }),
    });
    return updated;
  });
}

export async function reabrirCierreDiario(
  idusuario: number,
  idcierre: number,
  motivo: string,
) {
  const limpio = motivo.trim();
  if (limpio.length < 5) throw new GraphQLValidationError('Debe indicar un motivo de reapertura válido.');
  const cierre = await prisma.tbl_cierre_diario.findUnique({ where: { idcierre } });
  if (!cierre) throw new GraphQLValidationError('Cierre diario no encontrado.');
  await requerirAccesoMandante(idusuario, cierre.idmandante);
  if (cierre.estado !== 'CERRADO') {
    throw new GraphQLValidationError('Solo un cierre cerrado puede reabrirse.');
  }
  if (cierre.cerradoPor === idusuario) {
    throw new GraphQLValidationError(
      'El usuario que cerró el período no puede reabrirlo por sí mismo.',
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.tbl_cierre_diario.update({
      where: { idcierre },
      data: {
        estado: 'REABIERTO',
        motivoReapertura: limpio,
        reopenedAt: new Date(),
        closedAt: null,
        cerradoPor: null,
      },
      include: { detalles: true },
    });
    await registrarAuditoria(tx, {
      idusuario,
      entidad: 'tbl_cierre_diario',
      entidadId: idcierre,
      accion: 'REABRIR',
      detalle: JSON.stringify({ motivo: limpio }),
    });
    return updated;
  });
}

export async function listarCierresDiarios(
  idusuario: number,
  options?: { idmandante?: number; estado?: string; take?: number },
) {
  if (options?.idmandante) await requerirAccesoMandante(idusuario, options.idmandante);
  const rows = await prisma.tbl_cierre_diario.findMany({
    where: {
      ...(options?.idmandante ? { idmandante: options.idmandante } : {}),
      ...(options?.estado ? { estado: options.estado } : {}),
    },
    take: Math.min(Math.max(options?.take ?? 50, 1), 200),
    orderBy: [{ fechaNegocio: 'desc' }, { createdAt: 'desc' }],
    include: { detalles: true },
  });

  const visibles = [];
  for (const row of rows) {
    try {
      await requerirAccesoMandante(idusuario, row.idmandante);
      visibles.push(row);
    } catch {
      // No revelar cierres fuera del scope.
    }
  }
  return visibles;
}

export async function asegurarFechaPagoNoCerrada(input: {
  idmandante: number;
  fechaPago: Date;
  idagencia?: number | null;
  idusuarioCaja?: number | null;
}) {
  const fechaNegocio = inicioDiaNegocio(input.fechaPago);
  const cierre = await prisma.tbl_cierre_diario.findFirst({
    where: {
      idmandante: input.idmandante,
      fechaNegocio,
      estado: 'CERRADO',
      AND: [
        ...(input.idagencia != null
          ? [{ OR: [{ idagencia: input.idagencia }, { idagencia: null }] }]
          : []),
        ...(input.idusuarioCaja != null
          ? [{ OR: [{ idusuarioCaja: input.idusuarioCaja }, { idusuarioCaja: null }] }]
          : []),
      ],
    },
    select: { idcierre: true },
  });
  if (cierre) {
    throw new GraphQLValidationError(
      `La fecha del pago pertenece al cierre diario #${cierre.idcierre}, que está cerrado. Debe reabrirse de forma controlada antes de registrar el pago.`,
    );
  }
}
