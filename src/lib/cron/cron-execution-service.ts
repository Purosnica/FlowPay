import { prisma } from '@/lib/prisma';
import { calcularProximaEjecucion } from './cron-schedule';
import {
  CRON_MASTER_CODIGO,
  CRON_MASTER_SCHEDULE,
  CRON_SUB_JOBS,
} from './cron-registry';
import type { CronEstadoEjecucion } from './cron-types';

export async function asegurarCronJobsRegistrados(): Promise<void> {
  await prisma.tbl_cron_job.upsert({
    where: { codigo: CRON_MASTER_CODIGO },
    create: {
      codigo: CRON_MASTER_CODIGO,
      nombre: 'Operaciones de cobranza',
      descripcion: 'Orquestador diario de procesos operativos de cobranza.',
      schedule: CRON_MASTER_SCHEDULE,
      activo: true,
      timeoutMs: 900_000,
      maxReintentos: 1,
      orden: 0,
      proximaEjecucion: calcularProximaEjecucion(CRON_MASTER_SCHEDULE),
    },
    update: {
      nombre: 'Operaciones de cobranza',
      schedule: CRON_MASTER_SCHEDULE,
    },
  });

  for (const def of CRON_SUB_JOBS) {
    await prisma.tbl_cron_job.upsert({
      where: { codigo: def.codigo },
      create: {
        codigo: def.codigo,
        nombre: def.nombre,
        descripcion: def.descripcion,
        activo: true,
        timeoutMs: def.timeoutMs,
        maxReintentos: def.maxReintentos,
        orden: def.orden,
      },
      update: {
        nombre: def.nombre,
        descripcion: def.descripcion,
        timeoutMs: def.timeoutMs,
        maxReintentos: def.maxReintentos,
        orden: def.orden,
      },
    });
  }
}

export async function obtenerJobPorCodigo(codigo: string) {
  return prisma.tbl_cron_job.findUnique({ where: { codigo } });
}

export async function crearEjecucion(params: {
  idjob: number;
  idEjecucionPadre?: number | null;
  trigger: string;
  intento?: number;
}): Promise<{ idejecucion: number }> {
  const row = await prisma.tbl_cron_ejecucion.create({
    data: {
      idjob: params.idjob,
      idEjecucionPadre: params.idEjecucionPadre ?? null,
      estado: 'EN_CURSO',
      trigger: params.trigger,
      intento: params.intento ?? 1,
      iniciadoEn: new Date(),
    },
    select: { idejecucion: true },
  });
  return row;
}

export async function finalizarEjecucion(
  idejecucion: number,
  params: {
    estado: CronEstadoEjecucion;
    registrosProcesados?: number;
    resultado?: Record<string, unknown>;
    error?: string;
    iniciadoEn: Date;
  },
): Promise<void> {
  const finalizadoEn = new Date();
  const duracionMs = finalizadoEn.getTime() - params.iniciadoEn.getTime();

  await prisma.tbl_cron_ejecucion.update({
    where: { idejecucion },
    data: {
      estado: params.estado,
      finalizadoEn,
      duracionMs,
      registrosProcesados: params.registrosProcesados ?? 0,
      resultado: params.resultado ? JSON.stringify(params.resultado) : null,
      error: params.error?.slice(0, 4000) ?? null,
    },
  });
}

export async function actualizarEstadoJob(
  idjob: number,
  estado: CronEstadoEjecucion,
  schedule?: string | null,
): Promise<void> {
  const ahora = new Date();
  await prisma.tbl_cron_job.update({
    where: { idjob },
    data: {
      ultimaEjecucion: ahora,
      ultimoEstado: estado,
      proximaEjecucion: schedule
        ? calcularProximaEjecucion(schedule, ahora)
        : undefined,
    },
  });
}

export async function marcarEjecucionesExpiradas(
  idjob: number,
  timeoutMs: number,
): Promise<number> {
  const limite = new Date(Date.now() - timeoutMs);
  const expiradas = await prisma.tbl_cron_ejecucion.findMany({
    where: {
      idjob,
      estado: 'EN_CURSO',
      iniciadoEn: { lt: limite },
    },
    select: { idejecucion: true, iniciadoEn: true },
  });

  for (const ej of expiradas) {
    await finalizarEjecucion(ej.idejecucion, {
      estado: 'TIMEOUT',
      error: 'Ejecución expirada por timeout de lock',
      iniciadoEn: ej.iniciadoEn,
    });
  }

  return expiradas.length;
}

export async function hayEjecucionEnCurso(
  idjob: number,
  timeoutMs: number,
): Promise<boolean> {
  await marcarEjecucionesExpiradas(idjob, timeoutMs);

  const activa = await prisma.tbl_cron_ejecucion.findFirst({
    where: { idjob, estado: 'EN_CURSO' },
    select: { idejecucion: true },
  });

  return activa != null;
}
