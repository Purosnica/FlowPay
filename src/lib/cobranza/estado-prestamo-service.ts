import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { registrarAuditoria } from './auditoria-service';

export const ESTADOS_PRESTAMO = [
  'Vigente',
  'Vencido',
  'En negociación',
  'Con acuerdo',
  'Pendiente revisión',
  'Castigo',
  'Cancelado',
  'Finalizado',
] as const;

export type EstadoPrestamo = (typeof ESTADOS_PRESTAMO)[number];

type Tx = Prisma.TransactionClient;

const TRANSICIONES: Record<string, string[]> = {
  Vigente: ['Vencido', 'En negociación', 'Con acuerdo', 'Cancelado', 'Finalizado', 'Pendiente revisión'],
  Vencido: ['En negociación', 'Con acuerdo', 'Castigo', 'Cancelado', 'Finalizado', 'Pendiente revisión'],
  'En negociación': ['Con acuerdo', 'Vencido', 'Cancelado', 'Castigo'],
  'Con acuerdo': ['Vencido', 'Cancelado', 'Finalizado', 'Castigo'],
  'Pendiente revisión': ['Vigente', 'Vencido', 'Cancelado', 'Finalizado'],
  Castigo: ['Cancelado', 'Finalizado'],
  Cancelado: [],
  Finalizado: [],
};

export function puedeTransicionar(
  estadoActual: string,
  estadoNuevo: string,
): boolean {
  if (estadoActual === estadoNuevo) {
    return true;
  }
  const permitidos = TRANSICIONES[estadoActual];
  if (!permitidos) {
    return true;
  }
  return permitidos.includes(estadoNuevo);
}

export async function transicionarEstadoPrestamo(
  db: Tx | typeof prisma,
  params: {
    idprestamo: number;
    estadoNuevo: EstadoPrestamo | string;
    idusuario?: number | null;
    motivo?: string | null;
    forzar?: boolean;
  },
): Promise<void> {
  const prestamo = await db.tbl_prestamo.findUnique({
    where: { idprestamo: params.idprestamo },
    select: { estado: true, saldoTotal: true },
  });
  if (!prestamo) {
    return;
  }

  const estadoAnterior = prestamo.estado;
  if (estadoAnterior === params.estadoNuevo) {
    return;
  }

  if (!params.forzar && !puedeTransicionar(estadoAnterior, params.estadoNuevo)) {
    throw new Error(
      `Transición no permitida: ${estadoAnterior} → ${params.estadoNuevo}`,
    );
  }

  await db.tbl_prestamo.update({
    where: { idprestamo: params.idprestamo },
    data: { estado: params.estadoNuevo },
  });

  await db.tbl_prestamo_estado_historial.create({
    data: {
      idprestamo: params.idprestamo,
      estadoAnterior,
      estadoNuevo: params.estadoNuevo,
      motivo: params.motivo ?? null,
      idusuario: params.idusuario ?? null,
    },
  });

  await registrarAuditoria(db, {
    idusuario: params.idusuario,
    entidad: 'prestamo',
    entidadId: params.idprestamo,
    accion: 'transicion_estado',
    detalle: JSON.stringify({
      estadoAnterior,
      estadoNuevo: params.estadoNuevo,
      motivo: params.motivo,
    }),
  });
}

const ESTADOS_PROTEGIDOS = [
  'En negociación',
  'Con acuerdo',
  'Pendiente revisión',
  'Castigo',
];

export async function registrarEstadoInicial(
  db: Tx | typeof prisma,
  params: {
    idprestamo: number;
    estado: string;
    idusuario?: number | null;
    motivo?: string;
  },
): Promise<void> {
  const existe = await db.tbl_prestamo_estado_historial.findFirst({
    where: { idprestamo: params.idprestamo },
  });
  if (existe) {
    return;
  }
  await db.tbl_prestamo_estado_historial.create({
    data: {
      idprestamo: params.idprestamo,
      estadoAnterior: null,
      estadoNuevo: params.estado,
      motivo: params.motivo ?? 'Estado inicial',
      idusuario: params.idusuario ?? null,
    },
  });
}

export async function sincronizarEstadoPorMora(
  db: Tx | typeof prisma,
  idprestamo: number,
  idusuario?: number | null,
): Promise<void> {
  const prestamo = await db.tbl_prestamo.findUnique({
    where: { idprestamo },
    select: { estado: true, saldoTotal: true, diasMora: true },
  });
  if (!prestamo || ESTADOS_PROTEGIDOS.includes(prestamo.estado)) {
    return;
  }

  const saldo = Number(prestamo.saldoTotal);
  if (saldo <= 0) {
    await transicionarEstadoPrestamo(db, {
      idprestamo,
      estadoNuevo: 'Cancelado',
      idusuario,
      motivo: 'Saldo liquidado',
      forzar: true,
    });
    return;
  }

  const nuevo = prestamo.diasMora > 0 ? 'Vencido' : 'Vigente';
  if (prestamo.estado !== nuevo && prestamo.estado !== 'Cancelado') {
    await transicionarEstadoPrestamo(db, {
      idprestamo,
      estadoNuevo: nuevo,
      idusuario,
      motivo: 'Sincronización por días de mora',
    });
  }
}

export async function sincronizarEstadoPorSaldo(
  db: Tx,
  idprestamo: number,
  idusuario?: number | null,
): Promise<void> {
  const prestamo = await db.tbl_prestamo.findUnique({
    where: { idprestamo },
    select: { estado: true, saldoTotal: true, diasMora: true },
  });
  if (!prestamo) {
    return;
  }

  const saldo = Number(prestamo.saldoTotal);
  if (saldo <= 0 && prestamo.estado !== 'Cancelado') {
    await transicionarEstadoPrestamo(db, {
      idprestamo,
      estadoNuevo: 'Cancelado',
      idusuario,
      motivo: 'Saldo liquidado',
      forzar: true,
    });
    return;
  }

  if (saldo > 0 && prestamo.estado === 'Cancelado') {
    const nuevo =
      prestamo.diasMora > 0 ? 'Vencido' : 'Vigente';
    await transicionarEstadoPrestamo(db, {
      idprestamo,
      estadoNuevo: nuevo,
      idusuario,
      motivo: 'Reversión de pago',
      forzar: true,
    });
  }
}

export async function marcarEstadoAcuerdoVigente(
  db: Tx,
  idprestamo: number,
  idusuario?: number | null,
): Promise<void> {
  await transicionarEstadoPrestamo(db, {
    idprestamo,
    estadoNuevo: 'Con acuerdo',
    idusuario,
    motivo: 'Acuerdo vigente creado',
    forzar: true,
  });
}

export async function listarHistorialEstados(
  idprestamo: number,
  limit = 50,
): Promise<
  Array<{
    idhistorial: number;
    estadoAnterior: string | null;
    estadoNuevo: string;
    motivo: string | null;
    usuario: string | null;
    createdAt: Date;
  }>
> {
  const rows = await prisma.tbl_prestamo_estado_historial.findMany({
    where: { idprestamo },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    include: { usuario: { select: { nombre: true } } },
  });
  return rows.map((r) => ({
    idhistorial: r.idhistorial,
    estadoAnterior: r.estadoAnterior,
    estadoNuevo: r.estadoNuevo,
    motivo: r.motivo,
    usuario: r.usuario?.nombre ?? null,
    createdAt: r.createdAt,
  }));
}
