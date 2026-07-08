import { prisma } from '@/lib/prisma';

export interface CronJobMonitor {
  idjob: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  schedule: string | null;
  activo: boolean;
  timeoutMs: number;
  maxReintentos: number;
  orden: number;
  ultimaEjecucion: Date | null;
  proximaEjecucion: Date | null;
  ultimoEstado: string | null;
}

export interface CronEjecucionMonitor {
  idejecucion: number;
  idjob: number;
  codigoJob: string;
  nombreJob: string;
  idEjecucionPadre: number | null;
  estado: string;
  intento: number;
  trigger: string;
  iniciadoEn: Date;
  finalizadoEn: Date | null;
  duracionMs: number | null;
  registrosProcesados: number;
  resultado: string | null;
  error: string | null;
}

export interface CronMonitorResumen {
  jobs: CronJobMonitor[];
  ejecucionesRecientes: CronEjecucionMonitor[];
  estadisticas: {
    totalJobs: number;
    jobsActivos: number;
    ejecucionesOk24h: number;
    ejecucionesError24h: number;
    ultimaEjecucionGlobal: Date | null;
  };
}

export interface CronEjecucionesPage {
  filas: CronEjecucionMonitor[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function obtenerMonitorCron(): Promise<CronMonitorResumen> {
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [jobs, ejecucionesRecientes, ok24h, error24h] = await Promise.all([
    prisma.tbl_cron_job.findMany({ orderBy: { orden: 'asc' } }),
    prisma.tbl_cron_ejecucion.findMany({
      orderBy: { iniciadoEn: 'desc' },
      take: 30,
      include: { job: { select: { codigo: true, nombre: true } } },
    }),
    prisma.tbl_cron_ejecucion.count({
      where: { estado: 'OK', iniciadoEn: { gte: hace24h } },
    }),
    prisma.tbl_cron_ejecucion.count({
      where: {
        estado: { in: ['ERROR', 'TIMEOUT', 'PARCIAL'] },
        iniciadoEn: { gte: hace24h },
      },
    }),
  ]);

  const ultimaEjecucionGlobal =
    ejecucionesRecientes[0]?.iniciadoEn ?? null;

  return {
    jobs: jobs.map((j) => ({
      idjob: j.idjob,
      codigo: j.codigo,
      nombre: j.nombre,
      descripcion: j.descripcion,
      schedule: j.schedule,
      activo: j.activo,
      timeoutMs: j.timeoutMs,
      maxReintentos: j.maxReintentos,
      orden: j.orden,
      ultimaEjecucion: j.ultimaEjecucion,
      proximaEjecucion: j.proximaEjecucion,
      ultimoEstado: j.ultimoEstado,
    })),
    ejecucionesRecientes: ejecucionesRecientes.map((e) => ({
      idejecucion: e.idejecucion,
      idjob: e.idjob,
      codigoJob: e.job.codigo,
      nombreJob: e.job.nombre,
      idEjecucionPadre: e.idEjecucionPadre,
      estado: e.estado,
      intento: e.intento,
      trigger: e.trigger,
      iniciadoEn: e.iniciadoEn,
      finalizadoEn: e.finalizadoEn,
      duracionMs: e.duracionMs,
      registrosProcesados: e.registrosProcesados,
      resultado: e.resultado,
      error: e.error,
    })),
    estadisticas: {
      totalJobs: jobs.length,
      jobsActivos: jobs.filter((j) => j.activo).length,
      ejecucionesOk24h: ok24h,
      ejecucionesError24h: error24h,
      ultimaEjecucionGlobal,
    },
  };
}

export async function listarEjecucionesCron(params: {
  codigoJob?: string;
  estado?: string;
  page?: number;
  pageSize?: number;
}): Promise<CronEjecucionesPage> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where = {
    ...(params.estado ? { estado: params.estado } : {}),
    ...(params.codigoJob
      ? { job: { codigo: params.codigoJob } }
      : {}),
  };

  const [total, filas] = await Promise.all([
    prisma.tbl_cron_ejecucion.count({ where }),
    prisma.tbl_cron_ejecucion.findMany({
      where,
      orderBy: { iniciadoEn: 'desc' },
      skip,
      take: pageSize,
      include: { job: { select: { codigo: true, nombre: true } } },
    }),
  ]);

  return {
    filas: filas.map((e) => ({
      idejecucion: e.idejecucion,
      idjob: e.idjob,
      codigoJob: e.job.codigo,
      nombreJob: e.job.nombre,
      idEjecucionPadre: e.idEjecucionPadre,
      estado: e.estado,
      intento: e.intento,
      trigger: e.trigger,
      iniciadoEn: e.iniciadoEn,
      finalizadoEn: e.finalizadoEn,
      duracionMs: e.duracionMs,
      registrosProcesados: e.registrosProcesados,
      resultado: e.resultado,
      error: e.error,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}
