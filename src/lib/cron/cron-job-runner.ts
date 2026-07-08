import { type CronJobDefinition, type CronJobResult, type CronTrigger ,type  CronJobRunSummary } from './cron-types';
import {
  actualizarEstadoJob,
  crearEjecucion,
  finalizarEjecucion,
  hayEjecucionEnCurso,
  obtenerJobPorCodigo,
} from './cron-execution-service';


function serializarError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

function ejecutarConTimeout<T>(
  promesa: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout después de ${timeoutMs}ms`));
    }, timeoutMs);

    promesa
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

export async function ejecutarSubJobCron(
  def: CronJobDefinition,
  params: {
    idEjecucionPadre: number;
    trigger: CronTrigger;
  },
): Promise<CronJobRunSummary> {
  const jobDb = await obtenerJobPorCodigo(def.codigo);
  if (!jobDb || !jobDb.activo) {
    return {
      codigo: def.codigo,
      estado: 'OMITIDO',
      intentos: 0,
      duracionMs: 0,
      registrosProcesados: 0,
      error: 'Job inactivo o no registrado',
    };
  }

  const enCurso = await hayEjecucionEnCurso(jobDb.idjob, def.timeoutMs);
  if (enCurso) {
    return {
      codigo: def.codigo,
      estado: 'OMITIDO',
      intentos: 0,
      duracionMs: 0,
      registrosProcesados: 0,
      error: 'Ejecución concurrente detectada',
    };
  }

  const maxIntentos = Math.max(1, jobDb.maxReintentos);
  let ultimoError = '';
  const inicioTotal = Date.now();

  for (let intento = 1; intento <= maxIntentos; intento++) {
    const iniciadoEn = new Date();
    const { idejecucion } = await crearEjecucion({
      idjob: jobDb.idjob,
      idEjecucionPadre: params.idEjecucionPadre,
      trigger: params.trigger,
      intento,
    });

    try {
      const resultado: CronJobResult = await ejecutarConTimeout(
        def.ejecutar(),
        def.timeoutMs,
      );

      await finalizarEjecucion(idejecucion, {
        estado: 'OK',
        registrosProcesados: resultado.registrosProcesados,
        resultado: resultado.detalle,
        iniciadoEn,
      });

      await actualizarEstadoJob(jobDb.idjob, 'OK');

      return {
        codigo: def.codigo,
        estado: 'OK',
        intentos: intento,
        duracionMs: Date.now() - inicioTotal,
        registrosProcesados: resultado.registrosProcesados,
        detalle: resultado.detalle,
      };
    } catch (err) {
      ultimoError = serializarError(err);
      const esTimeout = ultimoError.includes('Timeout');
      const estado = esTimeout ? 'TIMEOUT' : 'ERROR';

      await finalizarEjecucion(idejecucion, {
        estado,
        error: ultimoError,
        iniciadoEn,
      });

      if (intento < maxIntentos) {
        continue;
      }

      await actualizarEstadoJob(jobDb.idjob, estado);

      return {
        codigo: def.codigo,
        estado,
        intentos: intento,
        duracionMs: Date.now() - inicioTotal,
        registrosProcesados: 0,
        error: ultimoError,
      };
    }
  }

  return {
    codigo: def.codigo,
    estado: 'ERROR',
    intentos: maxIntentos,
    duracionMs: Date.now() - inicioTotal,
    registrosProcesados: 0,
    error: ultimoError || 'Error desconocido',
  };
}
