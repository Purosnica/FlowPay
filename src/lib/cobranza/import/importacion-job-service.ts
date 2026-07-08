import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { importarCobranza ,type  TipoImportacionCobranza } from '@/lib/cobranza/import/import-orchestrator';

import { registrarAuditoria } from '@/lib/cobranza/auditoria-service';
import {
  obtenerImportMaxConcurrent,
  obtenerImportMaxJobsPerRun,
  obtenerImportStuckMinutes,
} from '@/lib/scalability/scalability-config';

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'imports');

export type EstadoImportacionJob =
  | 'PENDIENTE'
  | 'PROCESANDO'
  | 'COMPLETADO'
  | 'ERROR';

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

  const job = await prisma.tbl_importacion_job.create({
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
    },
  });

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
  const jobs = await prisma.tbl_importacion_job.findMany({
    where: { idusuario },
    orderBy: { createdAt: 'desc' },
    take: limite,
  });
  return jobs.map(mapJob);
}

export async function recuperarImportacionesAtascadas(): Promise<number> {
  const minutos = obtenerImportStuckMinutes();
  const limite = new Date(Date.now() - minutos * 60_000);
  const resultado = await prisma.tbl_importacion_job.updateMany({
    where: {
      estado: 'PROCESANDO',
      iniciadoEn: { lt: limite },
    },
    data: {
      estado: 'PENDIENTE',
      progresoPct: 0,
      error: null,
      iniciadoEn: null,
    },
  });
  return resultado.count;
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

  const pendientes = await prisma.tbl_importacion_job.findMany({
    where: { estado: 'PENDIENTE' },
    orderBy: { createdAt: 'asc' },
    take: cupo,
  });

  let procesados = 0;
  let errores = 0;

  for (const job of pendientes) {
    const ok = await procesarUnJob(job.idjob);
    if (ok) {
      procesados++;
    } else {
      errores++;
    }
  }

  return { procesados, errores };
}

async function procesarUnJob(idjob: number): Promise<boolean> {
  const job = await prisma.tbl_importacion_job.update({
    where: { idjob, estado: 'PENDIENTE' },
    data: {
      estado: 'PROCESANDO',
      iniciadoEn: new Date(),
      progresoPct: 5,
    },
  }).catch(() => null);

  if (!job) {
    return false;
  }

  try {
    const rutaAbsoluta = path.join(STORAGE_DIR, job.rutaArchivo);
    const buffer = await readFile(rutaAbsoluta);

    await prisma.tbl_importacion_job.update({
      where: { idjob },
      data: { progresoPct: 15 },
    });

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
    });

    const resultadoJson = JSON.stringify(resultado);
    const filasTotales =
      resultado.cartera?.totalFilas ??
      resultado.gestiones?.totalFilas ??
      resultado.pagos?.totalFilas ??
      0;

    await prisma.tbl_importacion_job.update({
      where: { idjob },
      data: {
        estado: 'COMPLETADO',
        progresoPct: 100,
        filasTotales,
        filasProcesadas: filasTotales,
        resultado: resultadoJson.slice(0, 65000),
        finalizadoEn: new Date(),
      },
    });

    await registrarAuditoria(prisma, {
      idusuario: job.idusuario,
      entidad: 'tbl_importacion_job',
      entidadId: idjob,
      accion: 'COMPLETADO',
      detalle: resultadoJson.slice(0, 2000),
    });

    return true;
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error desconocido';
    await prisma.tbl_importacion_job.update({
      where: { idjob },
      data: {
        estado: 'ERROR',
        error: mensaje.slice(0, 2000),
        finalizadoEn: new Date(),
      },
    });
    return false;
  }
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
