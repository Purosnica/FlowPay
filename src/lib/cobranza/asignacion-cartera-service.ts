import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { registrarAuditoria } from '@/lib/cobranza/auditoria-service';
import { decimalToNumber } from '@/lib/cobranza/decimal-utils';
import { diasMoraEnTramo } from '@/lib/cobranza/tramos-mora';

export type MetodoAsignacion =
  | 'POR_MORA'
  | 'ALEATORIO'
  | 'POR_CANTIDAD'
  | 'POR_MONTO';

export interface FiltrosAsignacionCartera {
  idmandante: number;
  idgestorAsignado?: number;
  estado?: string;
  tramoMoraMin?: number;
  tramoMoraMax?: number | null;
  idprestamos?: number[];
  sinAsignar?: boolean;
}

export interface SimulacionGestor {
  idgestor: number;
  nombre: string;
  cantidadPrestamos: number;
  saldoTotal: number;
  cantidadClientes: number;
}

export interface ResultadoSimulacionAsignacion {
  metodo: MetodoAsignacion;
  totalPrestamos: number;
  totalSaldo: number;
  gestores: SimulacionGestor[];
}

interface PrestamoAsignable {
  idprestamo: number;
  idcliente: number;
  saldoTotal: number;
  diasMora: number;
}

function construirWherePrestamos(
  filtros: FiltrosAsignacionCartera,
): Prisma.tbl_prestamoWhereInput {
  const where: Prisma.tbl_prestamoWhereInput = {
    idmandante: filtros.idmandante,
    deletedAt: null,
    bloqueadoAsignacion: false,
    estado: { notIn: ['Cancelado', 'Finalizado'] },
  };

  if (filtros.idprestamos?.length) {
    where.idprestamo = { in: filtros.idprestamos };
  }
  if (filtros.idgestorAsignado) {
    where.idgestorAsignado = filtros.idgestorAsignado;
  }
  if (filtros.estado) {
    where.estado = filtros.estado;
  }
  if (filtros.sinAsignar) {
    where.idgestorAsignado = null;
  }
  if (filtros.tramoMoraMin !== undefined) {
    const min = filtros.tramoMoraMin;
    const max = filtros.tramoMoraMax ?? null;
    if (max === null) {
      where.diasMora = { gte: min };
    } else {
      where.diasMora = { gte: min, lte: max };
    }
  }

  return where;
}

async function obtenerPrestamosAsignables(
  filtros: FiltrosAsignacionCartera,
): Promise<PrestamoAsignable[]> {
  const prestamos = await prisma.tbl_prestamo.findMany({
    where: construirWherePrestamos(filtros),
    select: {
      idprestamo: true,
      idcliente: true,
      saldoTotal: true,
      diasMora: true,
    },
  });

  return prestamos.map((p) => ({
    idprestamo: p.idprestamo,
    idcliente: p.idcliente,
    saldoTotal: decimalToNumber(p.saldoTotal),
    diasMora: p.diasMora,
  }));
}

function distribuirPorCantidad(
  prestamos: PrestamoAsignable[],
  gestores: number[],
): Map<number, PrestamoAsignable[]> {
  const mapa = new Map<number, PrestamoAsignable[]>();
  gestores.forEach((g) => mapa.set(g, []));

  prestamos.forEach((p, i) => {
    const gestor = gestores[i % gestores.length];
    mapa.get(gestor)?.push(p);
  });

  return mapa;
}

function distribuirPorMonto(
  prestamos: PrestamoAsignable[],
  gestores: number[],
): Map<number, PrestamoAsignable[]> {
  const mapa = new Map<number, PrestamoAsignable[]>();
  const saldos = new Map<number, number>();
  gestores.forEach((g) => {
    mapa.set(g, []);
    saldos.set(g, 0);
  });

  const ordenados = [...prestamos].sort((a, b) => b.saldoTotal - a.saldoTotal);

  for (const prestamo of ordenados) {
    const gestorMenor = gestores.reduce((min, g) =>
      (saldos.get(g) ?? 0) < (saldos.get(min) ?? 0) ? g : min,
    );
    mapa.get(gestorMenor)?.push(prestamo);
    saldos.set(gestorMenor, (saldos.get(gestorMenor) ?? 0) + prestamo.saldoTotal);
  }

  return mapa;
}

function distribuirAleatorio(
  prestamos: PrestamoAsignable[],
  gestores: number[],
): Map<number, PrestamoAsignable[]> {
  const mezclados = [...prestamos].sort(() => Math.random() - 0.5);
  return distribuirPorCantidad(mezclados, gestores);
}

function distribuirPorMora(
  prestamos: PrestamoAsignable[],
  gestores: number[],
  tramoMoraMin?: number,
  tramoMoraMax?: number | null,
): Map<number, PrestamoAsignable[]> {
  const filtrados =
    tramoMoraMin !== undefined
      ? prestamos.filter((p) =>
          diasMoraEnTramo(p.diasMora, tramoMoraMin, tramoMoraMax ?? null),
        )
      : prestamos;

  return distribuirPorCantidad(filtrados, gestores);
}

function calcularSimulacion(
  distribucion: Map<number, PrestamoAsignable[]>,
  nombresGestores: Map<number, string>,
  metodo: MetodoAsignacion,
): ResultadoSimulacionAsignacion {
  const gestores: SimulacionGestor[] = [];
  let totalPrestamos = 0;
  let totalSaldo = 0;

  for (const [idgestor, prestamos] of distribucion) {
    const saldo = prestamos.reduce((s, p) => s + p.saldoTotal, 0);
    const clientes = new Set(prestamos.map((p) => p.idcliente)).size;
    totalPrestamos += prestamos.length;
    totalSaldo += saldo;
    gestores.push({
      idgestor,
      nombre: nombresGestores.get(idgestor) ?? `Gestor ${idgestor}`,
      cantidadPrestamos: prestamos.length,
      saldoTotal: Math.round(saldo * 100) / 100,
      cantidadClientes: clientes,
    });
  }

  return {
    metodo,
    totalPrestamos,
    totalSaldo: Math.round(totalSaldo * 100) / 100,
    gestores,
  };
}

export async function simularAsignacionCartera(
  idusuario: number,
  filtros: FiltrosAsignacionCartera,
  idgestores: number[],
  metodo: MetodoAsignacion,
): Promise<ResultadoSimulacionAsignacion> {
  await requerirAccesoMandante(idusuario, filtros.idmandante);

  if (idgestores.length === 0) {
    throw new Error('Debe seleccionar al menos un cobrador.');
  }

  const prestamos = await obtenerPrestamosAsignables(filtros);
  const usuarios = await prisma.tbl_usuario.findMany({
    where: { idusuario: { in: idgestores }, deletedAt: null },
    select: { idusuario: true, nombre: true },
  });
  const nombres = new Map(usuarios.map((u) => [u.idusuario, u.nombre]));

  const distribucion = construirDistribucion(
    prestamos,
    idgestores,
    metodo,
    filtros,
  );

  return calcularSimulacion(distribucion, nombres, metodo);
}

export async function registrarHistorialAsignacion(
  idprestamo: number,
  idgestorAnterior: number | null,
  idgestorNuevo: number,
  idusuario: number,
  motivo?: string | null,
): Promise<void> {
  await prisma.tbl_prestamo_asignacion_historial.create({
    data: {
      idprestamo,
      idgestorAnterior,
      idgestorNuevo,
      idusuario,
      motivo: motivo ?? null,
    },
  });
}

export async function asignarGestorConHistorial(
  idprestamo: number,
  idgestorNuevo: number,
  idusuario: number,
  motivo?: string | null,
): Promise<void> {
  const prestamo = await prisma.tbl_prestamo.findUnique({
    where: { idprestamo },
    select: {
      idgestorAsignado: true,
      bloqueadoAsignacion: true,
      idmandante: true,
      deletedAt: true,
    },
  });

  if (!prestamo || prestamo.deletedAt) {
    throw new Error('Préstamo no encontrado.');
  }

  await requerirAccesoMandante(idusuario, prestamo.idmandante);

  const gestorAnterior = prestamo.idgestorAsignado;

  await prisma.tbl_prestamo.update({
    where: { idprestamo },
    data: { idgestorAsignado: idgestorNuevo },
  });

  await registrarHistorialAsignacion(
    idprestamo,
    gestorAnterior,
    idgestorNuevo,
    idusuario,
    motivo,
  );

  await registrarAuditoria(prisma, {
    idusuario,
    entidad: 'prestamo',
    entidadId: idprestamo,
    accion: 'asignacion_gestor',
    detalle: JSON.stringify({
      gestorAnterior,
      gestorNuevo: idgestorNuevo,
      motivo,
    }),
  });
}

/** Lotes para evitar miles de queries secuenciales en asignaciones masivas. */
const ASIGNACION_BATCH_SIZE = 100;

const ASIGNACION_TRANSACTION_OPTIONS = {
  maxWait: 15_000,
  timeout: 120_000,
} as const;

function construirDistribucion(
  prestamos: PrestamoAsignable[],
  idgestores: number[],
  metodo: MetodoAsignacion,
  filtros: FiltrosAsignacionCartera,
): Map<number, PrestamoAsignable[]> {
  switch (metodo) {
    case 'POR_MORA':
      return distribuirPorMora(
        prestamos,
        idgestores,
        filtros.tramoMoraMin,
        filtros.tramoMoraMax,
      );
    case 'ALEATORIO':
      return distribuirAleatorio(prestamos, idgestores);
    case 'POR_MONTO':
      return distribuirPorMonto(prestamos, idgestores);
    case 'POR_CANTIDAD':
    default:
      return distribuirPorCantidad(prestamos, idgestores);
  }
}

/**
 * Aplica la distribución en lotes (updateMany + createMany)
 * en lugar de N updates/historiales/auditorías por préstamo.
 */
async function aplicarDistribucionEnLotes(
  idusuario: number,
  distribucion: Map<number, PrestamoAsignable[]>,
  motivo?: string | null,
): Promise<number> {
  const todosIds = [...distribucion.values()].flatMap((lista) =>
    lista.map((p) => p.idprestamo),
  );

  if (todosIds.length === 0) {
    return 0;
  }

  const actuales = await prisma.tbl_prestamo.findMany({
    where: { idprestamo: { in: todosIds }, deletedAt: null },
    select: { idprestamo: true, idgestorAsignado: true },
  });
  const gestorAnteriorPorPrestamo = new Map(
    actuales.map((p) => [p.idprestamo, p.idgestorAsignado]),
  );
  const idsValidos = new Set(actuales.map((p) => p.idprestamo));

  let asignados = 0;

  for (const [idgestor, lista] of distribucion) {
    const idprestamos = lista
      .map((p) => p.idprestamo)
      .filter((id) => idsValidos.has(id));

    for (let i = 0; i < idprestamos.length; i += ASIGNACION_BATCH_SIZE) {
      const batch = idprestamos.slice(i, i + ASIGNACION_BATCH_SIZE);

      await prisma.$transaction(async (tx) => {
        await tx.tbl_prestamo.updateMany({
          where: { idprestamo: { in: batch } },
          data: { idgestorAsignado: idgestor },
        });

        await tx.tbl_prestamo_asignacion_historial.createMany({
          data: batch.map((idprestamo) => ({
            idprestamo,
            idgestorAnterior:
              gestorAnteriorPorPrestamo.get(idprestamo) ?? null,
            idgestorNuevo: idgestor,
            idusuario,
            motivo: motivo ?? null,
          })),
        });

        await tx.tbl_auditoria.createMany({
          data: batch.map((idprestamo) => ({
            idusuario,
            entidad: 'prestamo',
            entidadId: idprestamo,
            accion: 'asignacion_gestor',
            detalle: JSON.stringify({
              gestorAnterior:
                gestorAnteriorPorPrestamo.get(idprestamo) ?? null,
              gestorNuevo: idgestor,
              motivo,
            }),
          })),
        });
      }, ASIGNACION_TRANSACTION_OPTIONS);

      asignados += batch.length;
    }
  }

  return asignados;
}

export async function ejecutarAsignacionCartera(
  idusuario: number,
  filtros: FiltrosAsignacionCartera,
  idgestores: number[],
  metodo: MetodoAsignacion,
  motivo?: string | null,
): Promise<{ asignados: number }> {
  await requerirAccesoMandante(idusuario, filtros.idmandante);

  if (idgestores.length === 0) {
    throw new Error('Debe seleccionar al menos un cobrador.');
  }

  const prestamos = await obtenerPrestamosAsignables(filtros);
  const usuarios = await prisma.tbl_usuario.findMany({
    where: { idusuario: { in: idgestores }, deletedAt: null },
    select: { idusuario: true, nombre: true },
  });
  const nombres = new Map(usuarios.map((u) => [u.idusuario, u.nombre]));

  const distribucion = construirDistribucion(
    prestamos,
    idgestores,
    metodo,
    filtros,
  );
  const simulacion = calcularSimulacion(distribucion, nombres, metodo);
  const asignados = await aplicarDistribucionEnLotes(
    idusuario,
    distribucion,
    motivo,
  );

  await registrarAuditoria(prisma, {
    idusuario,
    entidad: 'asignacion_cartera',
    entidadId: filtros.idmandante,
    accion: metodo,
    detalle: JSON.stringify({
      asignados,
      simulacion,
      motivo,
    }).slice(0, 3500),
  });

  return { asignados };
}

export async function cancelarPrestamo(
  idprestamo: number,
  idusuario: number,
  motivo?: string | null,
): Promise<void> {
  const prestamo = await prisma.tbl_prestamo.findUnique({
    where: { idprestamo },
    select: { idmandante: true, estado: true, deletedAt: true },
  });

  if (!prestamo || prestamo.deletedAt) {
    throw new Error('Préstamo no encontrado.');
  }

  await requerirAccesoMandante(idusuario, prestamo.idmandante);

  if (prestamo.estado === 'Cancelado') {
    return;
  }

  await prisma.tbl_prestamo.update({
    where: { idprestamo },
    data: { estado: 'Cancelado', saldoTotal: 0 },
  });

  await registrarAuditoria(prisma, {
    idusuario,
    entidad: 'prestamo',
    entidadId: idprestamo,
    accion: 'cancelacion',
    detalle: JSON.stringify({
      estadoAnterior: prestamo.estado,
      motivo,
    }),
  });
}

export async function toggleBloqueoAsignacion(
  idprestamo: number,
  idusuario: number,
  bloqueado: boolean,
): Promise<void> {
  const prestamo = await prisma.tbl_prestamo.findUnique({
    where: { idprestamo },
    select: { idmandante: true, bloqueadoAsignacion: true, deletedAt: true },
  });

  if (!prestamo || prestamo.deletedAt) {
    throw new Error('Préstamo no encontrado.');
  }

  await requerirAccesoMandante(idusuario, prestamo.idmandante);

  await prisma.tbl_prestamo.update({
    where: { idprestamo },
    data: { bloqueadoAsignacion: bloqueado },
  });

  await registrarAuditoria(prisma, {
    idusuario,
    entidad: 'prestamo',
    entidadId: idprestamo,
    accion: bloqueado ? 'bloqueo_asignacion' : 'desbloqueo_asignacion',
    detalle: JSON.stringify({
      bloqueadoAnterior: prestamo.bloqueadoAsignacion,
      bloqueadoNuevo: bloqueado,
    }),
  });
}

export async function listarHistorialAsignacion(
  idusuario: number,
  idprestamo: number,
  limit = 50,
): Promise<
  Array<{
    idhistorial: number;
    gestorAnterior: string | null;
    gestorNuevo: string;
    usuario: string;
    motivo: string | null;
    createdAt: Date;
  }>
> {
  const prestamo = await prisma.tbl_prestamo.findUnique({
    where: { idprestamo },
    select: { idmandante: true },
  });

  if (!prestamo) {
    throw new Error('Préstamo no encontrado.');
  }

  await requerirAccesoMandante(idusuario, prestamo.idmandante);

  const historial = await prisma.tbl_prestamo_asignacion_historial.findMany({
    where: { idprestamo },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    include: {
      gestorAnterior: { select: { nombre: true } },
      gestorNuevo: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
    },
  });

  return historial.map((h) => ({
    idhistorial: h.idhistorial,
    gestorAnterior: h.gestorAnterior?.nombre ?? null,
    gestorNuevo: h.gestorNuevo.nombre,
    usuario: h.usuario.nombre,
    motivo: h.motivo,
    createdAt: h.createdAt,
  }));
}
