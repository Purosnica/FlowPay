import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { importarCobranza ,type  TipoImportacionCobranza } from '@/lib/cobranza/import/import-orchestrator';
import type { ResultadoImportacionCompleta } from '@/types/cobranza';

import { registrarAuditoria } from '@/lib/cobranza/auditoria-service';
import {
  obtenerImportMaxConcurrent,
  obtenerImportMaxJobsPerRun,
  obtenerImportStuckMinutes,
} from '@/lib/scalability/scalability-config';
import { isShuttingDown } from '@/lib/scalability/graceful-shutdown';
import { encolarWebhookMandante } from '@/lib/cobranza/webhook-mandante-service';
import { resolverStorageRoot } from '@/lib/cobranza/storage-root';

const STORAGE_DIR = path.join(resolverStorageRoot(), 'imports');
const FINALIZAR_JOB_REINTENTOS = 3;
const FINALIZAR_JOB_ESPERA_MS = 2_000;
const RECONCILIAR_GRACIA_MS = 5 * 60_000;

export type EstadoImportacionJob =
  | 'PENDIENTE'
  | 'PROCESANDO'
  | 'COMPLETADO'
  | 'ERROR'
  | 'DEAD_LETTER';

const MAX_INTENTOS_ANTES_DLQ = 3;
export interface CrearImportacionJobInput {
  idmandante: number;
  idusuario: number;
  tipo: TipoImportacionCobranza;
  nombreArchivo: string;
  buffer: Buffer;
  idcampana?: number;
  fechaCorte?: Date;
  nombreHoja?: string;
  idplantillaImp?: number;
  /** Header Idempotency-Key (I059). */
  idempotencyKey?: string;
}

export interface ImportacionJobResumen {
  idjob: number;
  idmandante: number;
  idcampana: number | null;
  tipo: string;
  estado: string;
  nombreArchivo: string;
  progresoPct: number;
  filasProcesadas: number;
  filasTotales: number;
  resultado: string | null;
  error: string | null;
  createdAt: Date;
  iniciadoEn: Date | null;
  finalizadoEn: Date | null;
}

async function asegurarDirectorioImports(): Promise<void> {
  await mkdir(STORAGE_DIR, { recursive: true });
}

function sanitizarNombreArchivo(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function crearImportacionJob(
  input: CrearImportacionJobInput,
): Promise<ImportacionJobResumen> {
  await requerirAccesoMandante(input.idusuario, input.idmandante);
  await asegurarDirectorioImports();

  const key =
    input.idempotencyKey && input.idempotencyKey.trim().length > 0
      ? input.idempotencyKey.trim().slice(0, 64)
      : null;

  if (key) {
    const existente = await prisma.tbl_importacion_job.findFirst({
      where: {
        idusuario: input.idusuario,
        idempotencyKey: key,
      },
    });
    if (existente) {
      return mapJob(existente);
    }
  }

  let job;
  try {
    job = await prisma.tbl_importacion_job.create({
      data: {
        idmandante: input.idmandante,
        idcampana: input.idcampana ?? null,
        idusuario: input.idusuario,
        tipo: input.tipo,
        estado: 'PENDIENTE',
        nombreArchivo: input.nombreArchivo,
        rutaArchivo: '',
        fechaCorte: input.fechaCorte ?? null,
        nombreHoja: input.nombreHoja ?? null,
        idplantillaImp: input.idplantillaImp ?? null,
        idempotencyKey: key,
      },
    });
  } catch (err) {
    if (
      key &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      const race = await prisma.tbl_importacion_job.findFirst({
        where: { idusuario: input.idusuario, idempotencyKey: key },
      });
      if (race) {
        return mapJob(race);
      }
    }
    throw err;
  }

  const rutaRelativa = path.join(
    String(job.idjob),
    sanitizarNombreArchivo(input.nombreArchivo),
  );
  const rutaAbsoluta = path.join(STORAGE_DIR, rutaRelativa);
  await mkdir(path.dirname(rutaAbsoluta), { recursive: true });
  await writeFile(rutaAbsoluta, input.buffer);

  const actualizado = await prisma.tbl_importacion_job.update({
    where: { idjob: job.idjob },
    data: { rutaArchivo: rutaRelativa },
  });

  return mapJob(actualizado);
}

export async function obtenerImportacionJob(
  idjob: number,
  idusuario: number,
): Promise<ImportacionJobResumen | null> {
  await reconciliarImportacionesAtascadas();

  const job = await prisma.tbl_importacion_job.findUnique({
    where: { idjob },
  });
  if (!job) {
    return null;
  }
  await requerirAccesoMandante(idusuario, job.idmandante);
  return mapJob(job);
}

export async function listarImportacionJobs(
  idusuario: number,
  limite = 20,
): Promise<ImportacionJobResumen[]> {
  await reconciliarImportacionesAtascadas();

  const jobs = await prisma.tbl_importacion_job.findMany({
    where: { idusuario },
    orderBy: { createdAt: 'desc' },
    take: limite,
  });
  return jobs.map(mapJob);
}

export async function recuperarImportacionesAtascadas(): Promise<number> {
  const reconciliados = await reconciliarImportacionesAtascadas();

  const minutos = obtenerImportStuckMinutes();
  const limite = new Date(Date.now() - minutos * 60_000);

  // CARTERA: reencolar es relativamente seguro (upserts).
  // COMPLETO: no reencolar (puede haber aplicado cartera y fallar en pagos).
  const reencolados = await prisma.tbl_importacion_job.updateMany({
    where: {
      estado: 'PROCESANDO',
      iniciadoEn: { lt: limite },
      tipo: 'CARTERA',
    },
    data: {
      estado: 'PENDIENTE',
      progresoPct: 0,
      error: null,
      iniciadoEn: null,
    },
  });

  // PAGOS/GESTIONES/COMPLETO/etc.: dead-letter (no reintento auto).
  const marcadosDlq = await prisma.tbl_importacion_job.updateMany({
    where: {
      estado: 'PROCESANDO',
      iniciadoEn: { lt: limite },
      tipo: { not: 'CARTERA' },
    },
    data: {
      estado: 'DEAD_LETTER',
      deadLetterAt: new Date(),
      error:
        'Job interrumpido. Enviado a dead-letter para evitar ' +
        'duplicados. Use reencolarImportacionDeadLetter si aplica.',
      finalizadoEn: new Date(),
    },
  });

  return reconciliados + reencolados.count + marcadosDlq.count;
}

/**
 * Cierra jobs PROCESANDO cuya cartera ya quedó registrada en BD
 * (p. ej. el proceso murió antes de marcar COMPLETADO).
 */
export async function reconciliarImportacionesAtascadas(): Promise<number> {
  const gracia = new Date(Date.now() - RECONCILIAR_GRACIA_MS);
  const jobs = await prisma.tbl_importacion_job.findMany({
    where: {
      estado: 'PROCESANDO',
      iniciadoEn: { lt: gracia },
    },
  });

  let reconciliados = 0;

  for (const job of jobs) {
    // Solo CARTERA puede reconciliarse como COMPLETADO con seguridad.
    // COMPLETO no: la cartera puede estar OK y gestiones/pagos incompletos.
    if (job.tipo !== 'CARTERA') {
      continue;
    }

    const carga = await prisma.tbl_carga_cartera.findFirst({
      where: {
        idmandante: job.idmandante,
        idcampana: job.idcampana ?? undefined,
        nombreArchivo: job.nombreArchivo,
        createdAt: { gte: job.iniciadoEn ?? job.createdAt },
        totalPrestamos: { gt: 0 },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!carga) {
      continue;
    }

    const resultado: ResultadoImportacionCompleta = {
      tipo: job.tipo,
      cartera: {
        totalFilas: carga.totalPrestamos,
        clientesCreados: 0,
        clientesActualizados: 0,
        prestamosCreados: carga.prestamosNuevos,
        prestamosActualizados: carga.prestamosActualizados,
        prestamosSaldoActualizado: carga.prestamosSaldoCambiado,
        cortesRegistrados: 0,
        contactosCreados: 0,
        gestoresAsignados: 0,
        omitidos: 0,
        saldoTotalCartera: Number(carga.saldoTotal),
        prestamosAusentes: carga.prestamosAusentes,
        idcarga: carga.idcarga,
        errores: [],
      },
    };

    await marcarJobCompletado(
      job.idjob,
      resultado,
      job.idusuario,
      job.idmandante,
      job.tipo,
    );
    reconciliados++;
  }

  return reconciliados;
}

/**
 * Inicia el procesamiento sin bloquear la respuesta HTTP del encolado.
 * Si hay CRON_SECRET y baseUrl, delega al endpoint de cron.
 */
export function dispararProcesamientoImportaciones(baseUrl?: string): void {
  const maxJobs = obtenerImportMaxJobsPerRun();
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && baseUrl) {
    const url = new URL('/api/cron/procesar-importaciones', baseUrl);
    void fetch(url, {
      headers: { authorization: `Bearer ${cronSecret}` },
    }).catch((err: unknown) => {
      const mensaje =
        err instanceof Error ? err.message : 'Error al disparar cron de importaciones';
      console.error('[importacion-job] Falló disparo de cron:', mensaje);
    });
    return;
  }

  setImmediate(() => {
    void procesarImportacionesPendientes(maxJobs).catch((err: unknown) => {
      const mensaje =
        err instanceof Error ? err.message : 'Error procesando importaciones';
      console.error('[importacion-job] Error en procesamiento en segundo plano:', mensaje);
    });
  });
}

export async function procesarImportacionesPendientes(
  maxJobs?: number,
): Promise<{ procesados: number; errores: number }> {
  await recuperarImportacionesAtascadas();

  const maxConcurrent = obtenerImportMaxConcurrent();
  const enProceso = await prisma.tbl_importacion_job.count({
    where: { estado: 'PROCESANDO' },
  });
  if (enProceso >= maxConcurrent) {
    return { procesados: 0, errores: 0 };
  }

  const cupo = Math.min(
    maxJobs ?? obtenerImportMaxJobsPerRun(),
    maxConcurrent - enProceso,
  );
  if (cupo <= 0) {
    return { procesados: 0, errores: 0 };
  }

  // I117: sharding por mandante — round-robin justo entre mandantes con cola.
  const pendientes = await seleccionarJobsPendientesSharded(cupo);

  let procesados = 0;
  let errores = 0;

  for (const job of pendientes) {
    if (isShuttingDown()) {
      break;
    }
    const ok = await procesarUnJob(job.idjob);
    if (ok) {
      procesados++;
    } else {
      errores++;
    }
  }

  return { procesados, errores };
}

/**
 * Selecciona jobs PENDIENTE repartiendo cupo entre mandantes (1 job por
 * mandante por ronda) para evitar que un mandante monopolice IMPORT_MAX_CONCURRENT.
 */
async function seleccionarJobsPendientesSharded(
  cupo: number,
): Promise<Array<{ idjob: number }>> {
  const ocupados = await prisma.tbl_importacion_job.findMany({
    where: { estado: 'PROCESANDO' },
    select: { idmandante: true },
    distinct: ['idmandante'],
  });
  const mandantesOcupados = new Set(ocupados.map((o) => o.idmandante));

  const candidatos = await prisma.tbl_importacion_job.findMany({
    where: {
      estado: 'PENDIENTE',
      ...(mandantesOcupados.size > 0
        ? { idmandante: { notIn: [...mandantesOcupados] } }
        : {}),
    },
    orderBy: { createdAt: 'asc' },
    select: { idjob: true, idmandante: true },
    take: Math.max(cupo * 10, 50),
  });

  if (candidatos.length === 0) {
    return [];
  }

  const porMandante = new Map<number, Array<{ idjob: number }>>();
  for (const job of candidatos) {
    const lista = porMandante.get(job.idmandante) ?? [];
    lista.push({ idjob: job.idjob });
    porMandante.set(job.idmandante, lista);
  }

  const colas = [...porMandante.values()];
  const seleccionados: Array<{ idjob: number }> = [];
  let idx = 0;
  while (seleccionados.length < cupo && colas.some((c) => c.length > 0)) {
    const cola = colas[idx % colas.length];
    if (cola && cola.length > 0) {
      const next = cola.shift();
      if (next) {
        seleccionados.push(next);
      }
    }
    idx++;
  }

  return seleccionados;
}

async function procesarUnJob(idjob: number): Promise<boolean> {
  const job = await prisma.tbl_importacion_job.update({
    where: { idjob, estado: 'PENDIENTE' },
    data: {
      estado: 'PROCESANDO',
      iniciadoEn: new Date(),
      progresoPct: 5,
      intentos: { increment: 1 },
    },
  }).catch(() => null);

  if (!job) {
    return false;
  }

  const actualizarProgreso = async (progresoPct: number): Promise<void> => {
    await prisma.tbl_importacion_job
      .update({
        where: { idjob },
        data: { progresoPct },
      })
      .catch(() => undefined);
  };

  try {
    const rutaAbsoluta = path.join(STORAGE_DIR, job.rutaArchivo);
    const buffer = await readFile(rutaAbsoluta);

    await actualizarProgreso(15);

    const resultado = await importarCobranza({
      tipo: job.tipo as TipoImportacionCobranza,
      idusuario: job.idusuario,
      idmandante: job.idmandante,
      idcampana: job.idcampana ?? undefined,
      fechaCorte: job.fechaCorte ?? undefined,
      buffer,
      nombreArchivo: job.nombreArchivo,
      nombreHoja: job.nombreHoja ?? undefined,
      idplantillaImp: job.idplantillaImp ?? undefined,
      onProgreso: actualizarProgreso,
    });

    await marcarJobCompletado(idjob, resultado, job.idusuario, job.idmandante, job.tipo);
    return true;
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error desconocido';
    await marcarJobError(idjob, mensaje);
    return false;
  }
}

async function marcarJobCompletado(
  idjob: number,
  resultado: ResultadoImportacionCompleta,
  idusuario: number,
  idmandante: number,
  tipo: string,
): Promise<void> {
  const resultadoJson = JSON.stringify(resultado);
  const filasTotales =
    resultado.cartera?.totalFilas ??
    resultado.gestiones?.totalFilas ??
    resultado.pagos?.totalFilas ??
    0;

  for (let intento = 0; intento < FINALIZAR_JOB_REINTENTOS; intento++) {
    try {
      await prisma.tbl_importacion_job.update({
        where: { idjob },
        data: {
          estado: 'COMPLETADO',
          progresoPct: 100,
          filasTotales,
          filasProcesadas: filasTotales,
          resultado: resultadoJson.slice(0, 65000),
          error: null,
          finalizadoEn: new Date(),
        },
      });

      await registrarAuditoria(prisma, {
        idusuario,
        entidad: 'tbl_importacion_job',
        entidadId: idjob,
        accion: 'COMPLETADO',
        detalle: resultadoJson.slice(0, 2000),
      });

      encolarWebhookMandante({
        idmandante,
        event: 'importacion.completada',
        data: {
          idjob,
          tipo,
          filasTotales,
        },
      });

      if (tipo === 'CARTERA') {
        try {
          const { intentarAsignacionAutoPostImport } = await import(
            '@/lib/cobranza/asignacion-auto-post-import-service'
          );
          await intentarAsignacionAutoPostImport({
            idmandante,
            idusuario,
            idjob,
          });
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : 'Error asignación auto';
          await registrarAuditoria(prisma, {
            idusuario,
            entidad: 'tbl_importacion_job',
            entidadId: idjob,
            accion: 'ASIGNACION_AUTO_ERROR',
            detalle: msg.slice(0, 2000),
          });
        }
      }
      return;
    } catch {
      if (intento < FINALIZAR_JOB_REINTENTOS - 1) {
        await esperar(FINALIZAR_JOB_ESPERA_MS * (intento + 1));
      }
    }
  }

  throw new Error(
    `No se pudo marcar el job ${idjob} como COMPLETADO tras ${FINALIZAR_JOB_REINTENTOS} intentos.`,
  );
}

async function marcarJobError(idjob: number, mensaje: string): Promise<void> {
  const actual = await prisma.tbl_importacion_job.findUnique({
    where: { idjob },
    select: { intentos: true, tipo: true },
  });
  const intentos = actual?.intentos ?? 1;
  const aDeadLetter =
    intentos >= MAX_INTENTOS_ANTES_DLQ || actual?.tipo !== 'CARTERA';

  for (let intento = 0; intento < FINALIZAR_JOB_REINTENTOS; intento++) {
    try {
      await prisma.tbl_importacion_job.update({
        where: { idjob },
        data: aDeadLetter
          ? {
              estado: 'DEAD_LETTER',
              deadLetterAt: new Date(),
              error: mensaje.slice(0, 2000),
              finalizadoEn: new Date(),
            }
          : actual?.tipo === 'CARTERA'
            ? {
                estado: 'PENDIENTE',
                error: mensaje.slice(0, 2000),
                progresoPct: 0,
                iniciadoEn: null,
                finalizadoEn: null,
              }
            : {
                estado: 'ERROR',
                error: mensaje.slice(0, 2000),
                finalizadoEn: new Date(),
              },
      });
      return;
    } catch {
      if (intento < FINALIZAR_JOB_REINTENTOS - 1) {
        await esperar(FINALIZAR_JOB_ESPERA_MS * (intento + 1));
      }
    }
  }
}

/**
 * Reencola un job en dead-letter (solo CARTERA por seguridad anti-duplicados).
 */
export async function reencolarImportacionDeadLetter(
  idjob: number,
  idusuario: number,
): Promise<void> {
  const job = await prisma.tbl_importacion_job.findUnique({ where: { idjob } });
  if (!job || job.estado !== 'DEAD_LETTER') {
    throw new Error('Job no está en dead-letter.');
  }
  await requerirAccesoMandante(idusuario, job.idmandante);
  if (job.tipo !== 'CARTERA') {
    throw new Error(
      'Solo jobs CARTERA pueden reencolarse desde dead-letter automáticamente.',
    );
  }
  await prisma.tbl_importacion_job.update({
    where: { idjob },
    data: {
      estado: 'PENDIENTE',
      deadLetterAt: null,
      error: null,
      progresoPct: 0,
      iniciadoEn: null,
      finalizadoEn: null,
    },
  });
  await registrarAuditoria(prisma, {
    idusuario,
    entidad: 'tbl_importacion_job',
    entidadId: idjob,
    accion: 'REENCOLAR_DLQ',
  });
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function mapJob(job: {
  idjob: number;
  idmandante: number;
  idcampana: number | null;
  tipo: string;
  estado: string;
  nombreArchivo: string;
  progresoPct: number;
  filasProcesadas: number;
  filasTotales: number;
  resultado: string | null;
  error: string | null;
  createdAt: Date;
  iniciadoEn: Date | null;
  finalizadoEn: Date | null;
}): ImportacionJobResumen {
  return {
    idjob: job.idjob,
    idmandante: job.idmandante,
    idcampana: job.idcampana,
    tipo: job.tipo,
    estado: job.estado,
    nombreArchivo: job.nombreArchivo,
    progresoPct: job.progresoPct,
    filasProcesadas: job.filasProcesadas,
    filasTotales: job.filasTotales,
    resultado: job.resultado,
    error: job.error,
    createdAt: job.createdAt,
    iniciadoEn: job.iniciadoEn,
    finalizadoEn: job.finalizadoEn,
  };
}
