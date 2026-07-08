import { prisma } from '@/lib/prisma';
import { filtroMandante } from './mandante-scope';

export interface AuditoriaFila {
  idauditoria: number;
  entidad: string;
  entidadId: number | null;
  accion: string;
  detalle: string | null;
  usuario: string | null;
  createdAt: Date;
}

export interface AuditoriaPagina {
  filas: AuditoriaFila[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const ENTIDADES_AUDITORIA = [
  'prestamo',
  'pago',
  'acuerdo',
  'gestion',
  'carga_cartera',
  'reclamo',
  'usuario',
  'configuracion',
] as const;

export const ACCIONES_AUDITORIA = [
  'create',
  'update',
  'delete',
  'transicion_estado',
  'asignacion',
  'importacion',
  'cron',
  'login',
] as const;

function parseFecha(fecha?: string): Date | undefined {
  if (!fecha) {
    return undefined;
  }
  const parsed = new Date(fecha);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function listarAuditoria(
  idusuario: number,
  params: {
    entidad?: string;
    accion?: string;
    entidadId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<AuditoriaPagina> {
  await filtroMandante(idusuario);

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const fechaDesde = parseFecha(params.fechaDesde);
  const fechaHasta = parseFecha(params.fechaHasta);

  const where = {
    entidad: params.entidad ?? undefined,
    accion: params.accion ?? undefined,
    entidadId: params.entidadId ?? undefined,
    ...(fechaDesde || fechaHasta
      ? {
          createdAt: {
            ...(fechaDesde ? { gte: fechaDesde } : {}),
            ...(fechaHasta ? { lte: fechaHasta } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.tbl_auditoria.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { usuario: { select: { nombre: true } } },
    }),
    prisma.tbl_auditoria.count({ where }),
  ]);

  return {
    filas: rows.map((r) => ({
      idauditoria: r.idauditoria,
      entidad: r.entidad,
      entidadId: r.entidadId,
      accion: r.accion,
      detalle: r.detalle,
      usuario: r.usuario?.nombre ?? null,
      createdAt: r.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function obtenerResumenAuditoria(
  idusuario: number,
): Promise<{
  total24h: number;
  total7d: number;
  topEntidades: Array<{ entidad: string; cantidad: number }>;
}> {
  await filtroMandante(idusuario);

  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const hace7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total24h, total7d, agrupado] = await Promise.all([
    prisma.tbl_auditoria.count({
      where: { createdAt: { gte: hace24h } },
    }),
    prisma.tbl_auditoria.count({
      where: { createdAt: { gte: hace7d } },
    }),
    prisma.tbl_auditoria.groupBy({
      by: ['entidad'],
      where: { createdAt: { gte: hace7d } },
      _count: { idauditoria: true },
      orderBy: { _count: { idauditoria: 'desc' } },
      take: 5,
    }),
  ]);

  return {
    total24h,
    total7d,
    topEntidades: agrupado.map((g) => ({
      entidad: g.entidad,
      cantidad: g._count.idauditoria,
    })),
  };
}
