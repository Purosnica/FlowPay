import {
  asegurarCronJobsRegistrados,
  actualizarEstadoJob,
  crearEjecucion,
  finalizarEjecucion,
  hayEjecucionEnCurso,
  obtenerJobPorCodigo,
} from './cron-execution-service';
import { ejecutarSubJobCron } from './cron-job-runner';
import {
  CRON_MASTER_CODIGO,
  CRON_MASTER_SCHEDULE,
  CRON_SUB_JOBS,
  obtenerDefinicionSubJob,
} from './cron-registry';
import {
  adquirirBloqueoMysql,
  liberarBloqueoMysql,
} from '@/lib/scalability/mysql-advisory-lock';
import { CRON_MASTER_LOCK_NAME } from '@/lib/scalability/scalability-config';
import type {
  CronEstadoEjecucion,
  CronJobRunSummary,
  CronOrchestratorResult,
  CronTrigger,
} from './cron-types';
import { notificarFalloCronOperaciones } from '@/lib/cobranza/cron-alerta-email-service';
import { logger } from '@/lib/utils/logger';

function resolverEstadoOrquestador(
  jobs: CronJobRunSummary[],
): CronEstadoEjecucion {
  const errores = jobs.filter(
    (j) => j.estado === 'ERROR' || j.estado === 'TIMEOUT',
  ).length;
  const omitidos = jobs.filter((j) => j.estado === 'OMITIDO').length;
  const ok = jobs.filter((j) => j.estado === 'OK').length;

  if (errores > 0 && ok > 0) {
    return 'PARCIAL';
  }
  if (errores > 0) {
    return 'ERROR';
  }
  if (omitidos === jobs.length) {
    return 'OMITIDO';
  }
  return 'OK';
}

function ordenarJobsPorDependencias(): typeof CRON_SUB_JOBS {
  const ordenados: typeof CRON_SUB_JOBS = [];
  const pendientes = [...CRON_SUB_JOBS];
  const completados = new Set<string>();

  let iteraciones = 0;
  while (pendientes.length > 0 && iteraciones < pendientes.length * 2) {
    iteraciones++;
    const idx = pendientes.findIndex((job) =>
      (job.dependeDe ?? []).every((dep) => completados.has(dep)),
    );
    if (idx === -1) {
      ordenados.push(...pendientes);
      break;
    }
    const [job] = pendientes.splice(idx, 1);
    ordenados.push(job);
    completados.add(job.codigo);
  }

  return ordenados;
}

export async function ejecutarCronOperacionesCobranza(
  trigger: CronTrigger = 'cron',
): Promise<CronOrchestratorResult> {
  await asegurarCronJobsRegistrados();

  const masterJob = await obtenerJobPorCodigo(CRON_MASTER_CODIGO);
  if (!masterJob) {
    throw new Error('Job maestro de cron no registrado.');
  }

  if (!masterJob.activo) {
    return {
      idejecucion: 0,
      estado: 'OMITIDO',
      iniciadoEn: new Date().toISOString(),
      finalizadoEn: new Date().toISOString(),
      duracionMs: 0,
      jobs: [],
      errores: 0,
      omitidos: 0,
    };
  }

  const enCurso = await hayEjecucionEnCurso(
    masterJob.idjob,
    masterJob.timeoutMs,
  );
  if (enCurso) {
    return {
      idejecucion: 0,
      estado: 'OMITIDO',
      iniciadoEn: new Date().toISOString(),
      finalizadoEn: new Date().toISOString(),
      duracionMs: 0,
      jobs: [],
      errores: 0,
      omitidos: 1,
    };
  }

  const lockAdquirido = await adquirirBloqueoMysql(CRON_MASTER_LOCK_NAME, 0);
  if (!lockAdquirido) {
    return {
      idejecucion: 0,
      estado: 'OMITIDO',
      iniciadoEn: new Date().toISOString(),
      finalizadoEn: new Date().toISOString(),
      duracionMs: 0,
      jobs: [],
      errores: 0,
      omitidos: 1,
    };
  }

  try {
    return await ejecutarCronOperacionesCobranzaInterno(trigger);
  } finally {
    await liberarBloqueoMysql(CRON_MASTER_LOCK_NAME);
  }
}

async function ejecutarCronOperacionesCobranzaInterno(
  trigger: CronTrigger,
): Promise<CronOrchestratorResult> {
  const masterJob = await obtenerJobPorCodigo(CRON_MASTER_CODIGO);
  if (!masterJob) {
    throw new Error('Job maestro de cron no registrado.');
  }

  const iniciadoEn = new Date();
  const { idejecucion } = await crearEjecucion({
    idjob: masterJob.idjob,
    trigger,
    intento: 1,
  });

  const jobsOrdenados = ordenarJobsPorDependencias();
  const resultados: CronJobRunSummary[] = [];
  const estadosPrevios = new Map<string, CronEstadoEjecucion>();

  for (const def of jobsOrdenados) {
    const deps = def.dependeDe ?? [];
    const depFallida = deps.some((codigo) => {
      const estado = estadosPrevios.get(codigo);
      return estado === 'ERROR' || estado === 'TIMEOUT';
    });

    if (depFallida) {
      const omitido: CronJobRunSummary = {
        codigo: def.codigo,
        estado: 'OMITIDO',
        intentos: 0,
        duracionMs: 0,
        registrosProcesados: 0,
        error: 'Dependencia fallida',
      };
      resultados.push(omitido);
      estadosPrevios.set(def.codigo, 'OMITIDO');
      continue;
    }

    const jobDef = obtenerDefinicionSubJob(def.codigo);
    if (!jobDef) {
      continue;
    }

    const resumen = await ejecutarSubJobCron(jobDef, {
      idEjecucionPadre: idejecucion,
      trigger,
    });
    resultados.push(resumen);
    estadosPrevios.set(def.codigo, resumen.estado);
  }

  const estadoFinal = resolverEstadoOrquestador(resultados);
  const finalizadoEn = new Date();

  await finalizarEjecucion(idejecucion, {
    estado: estadoFinal,
    registrosProcesados: resultados.reduce(
      (s, j) => s + j.registrosProcesados,
      0,
    ),
    resultado: {
      jobs: resultados.map((j) => ({
        codigo: j.codigo,
        estado: j.estado,
        registrosProcesados: j.registrosProcesados,
        duracionMs: j.duracionMs,
        error: j.error,
      })),
    },
    iniciadoEn,
  });

  await actualizarEstadoJob(
    masterJob.idjob,
    estadoFinal,
    CRON_MASTER_SCHEDULE,
  );

  const errores = resultados.filter(
    (j) => j.estado === 'ERROR' || j.estado === 'TIMEOUT',
  ).length;
  const omitidos = resultados.filter((j) => j.estado === 'OMITIDO').length;
  const duracionMs = finalizadoEn.getTime() - iniciadoEn.getTime();

  try {
    const alerta = await notificarFalloCronOperaciones({
      estado: estadoFinal,
      trigger,
      idejecucion,
      duracionMs,
      jobs: resultados,
    });
    if (alerta.enviada || (alerta.errores > 0 && !alerta.omitida)) {
      logger.warn('Alerta cron operaciones', {
        idejecucion,
        estado: estadoFinal,
        enviados: alerta.enviados,
        errores: alerta.errores,
        omitida: alerta.omitida,
        motivo: alerta.motivoOmitida,
      });
    }
  } catch (err) {
    logger.error(
      'Fallo al enviar alerta de cron',
      err instanceof Error ? err : undefined,
    );
  }

  return {
    idejecucion,
    estado: estadoFinal,
    iniciadoEn: iniciadoEn.toISOString(),
    finalizadoEn: finalizadoEn.toISOString(),
    duracionMs,
    jobs: resultados,
    errores,
    omitidos,
  };
}
