import type { Prisma } from '@prisma/client';
import { type prisma } from '@/lib/prisma';

export interface RegistroAuditoriaInput {
  idusuario?: number | null;
  entidad: string;
  entidadId?: number | null;
  accion: string;
  detalle?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export async function registrarAuditoria(
  client: PrismaClientLike,
  data: RegistroAuditoriaInput,
): Promise<void> {
  await client.tbl_auditoria.create({
    data: {
      idusuario: data.idusuario ?? null,
      entidad: data.entidad,
      entidadId: data.entidadId ?? null,
      accion: data.accion,
      detalle: data.detalle ?? null,
      ip: data.ip ?? null,
      userAgent: data.userAgent ?? null,
    },
  });
}
