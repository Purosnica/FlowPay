import { prisma } from '@/lib/prisma';
import {
  obtenerAuditRetentionDays,
  obtenerCronRetentionDays,
} from '@/lib/scalability/scalability-config';

export interface RetencionAuditoriaResultado {
  auditoriaEliminados: number;
  cronEjecucionesEliminadas: number;
  rateLimitEliminados: number;
}

export async function purgarDatosHistoricos(
  diasAuditoria?: number,
  diasCron?: number,
): Promise<RetencionAuditoriaResultado> {
  const diasAudit = diasAuditoria ?? obtenerAuditRetentionDays();
  const diasCronVal = diasCron ?? obtenerCronRetentionDays();

  const limiteAuditoria = new Date();
  limiteAuditoria.setDate(limiteAuditoria.getDate() - diasAudit);

  const limiteCron = new Date();
  limiteCron.setDate(limiteCron.getDate() - diasCronVal);

  const ahora = new Date();

  const [auditoria, cronEjecuciones, rateLimit] = await Promise.all([
    prisma.tbl_auditoria.deleteMany({
      // Sin almacenamiento WORM configurado ningún evento HOT puede purgarse.
      // Solo un archivador externo que haya persistido y verificado la copia puede
      // marcar explícitamente PURGE_ALLOWED.
      where: {
        createdAt: { lt: limiteAuditoria },
        archivoEstado: 'PURGE_ALLOWED',
        archivedAt: { not: null },
        archivoUri: { not: null },
      },
    }),
    prisma.tbl_cron_ejecucion.deleteMany({
      where: { iniciadoEn: { lt: limiteCron } },
    }),
    prisma.tbl_rate_limit.deleteMany({
      where: { expiraEn: { lt: ahora } },
    }),
  ]);

  return {
    auditoriaEliminados: auditoria.count,
    cronEjecucionesEliminadas: cronEjecuciones.count,
    rateLimitEliminados: rateLimit.count,
  };
}
