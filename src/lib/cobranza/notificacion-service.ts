import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  CrearNotificacionInput,
  NotificacionPersistida,
  SeveridadNotificacion,
} from '@/types/notificacion';

type DbClient = Prisma.TransactionClient | typeof prisma;

const PREFIJO_ID = 'notif-';
const MAX_NOTIFICACIONES_PERSISTIDAS = 30;

export function idPublicoNotificacion(idnotificacion: number): string {
  return `${PREFIJO_ID}${idnotificacion}`;
}

export function esIdNotificacionPersistida(id: string): boolean {
  return id.startsWith(PREFIJO_ID);
}

export function parseIdNotificacionPersistida(id: string): number | null {
  if (!esIdNotificacionPersistida(id)) {
    return null;
  }
  const parsed = Number.parseInt(id.slice(PREFIJO_ID.length), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function mapNotificacion(row: {
  idnotificacion: number;
  tipo: string;
  severidad: string;
  titulo: string;
  mensaje: string;
  url: string | null;
  createdAt: Date;
  leida: boolean;
}): NotificacionPersistida {
  return {
    id: idPublicoNotificacion(row.idnotificacion),
    tipo: row.tipo,
    severidad: row.severidad as SeveridadNotificacion,
    titulo: row.titulo,
    mensaje: row.mensaje,
    url: row.url,
    createdAt: row.createdAt,
    leida: row.leida,
  };
}

export async function crearNotificacion(
  input: CrearNotificacionInput,
  db: DbClient = prisma,
): Promise<number> {
  const created = await db.tbl_notificacion.create({
    data: {
      idusuario: input.idusuario,
      tipo: input.tipo,
      severidad: input.severidad ?? 'info',
      titulo: input.titulo,
      mensaje: input.mensaje,
      url: input.url ?? null,
      entidad: input.entidad ?? null,
      entidadId: input.entidadId ?? null,
    },
    select: { idnotificacion: true },
  });
  return created.idnotificacion;
}

export async function obtenerNotificacionesPersistidas(
  idusuario: number,
  limite = MAX_NOTIFICACIONES_PERSISTIDAS,
): Promise<NotificacionPersistida[]> {
  const rows = await prisma.tbl_notificacion.findMany({
    where: { idusuario },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limite, 1), MAX_NOTIFICACIONES_PERSISTIDAS),
    select: {
      idnotificacion: true,
      tipo: true,
      severidad: true,
      titulo: true,
      mensaje: true,
      url: true,
      createdAt: true,
      leida: true,
    },
  });

  return rows.map(mapNotificacion);
}

export async function marcarNotificacionesPersistidasLeidas(
  idusuario: number,
  ids: string[],
): Promise<number> {
  const numericIds = ids
    .map(parseIdNotificacionPersistida)
    .filter((id): id is number => id !== null);

  if (numericIds.length === 0) {
    return 0;
  }

  const result = await prisma.tbl_notificacion.updateMany({
    where: {
      idusuario,
      idnotificacion: { in: numericIds },
      leida: false,
    },
    data: {
      leida: true,
      leidaEn: new Date(),
    },
  });

  return result.count;
}
