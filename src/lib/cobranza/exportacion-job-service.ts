/**
 * Jobs de exportación async para reportes >10k filas (evita timeouts Vercel).
 */

import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { EXPORT_ASYNC_ROW_THRESHOLD } from '@/lib/cobranza/performance-limits';
import { logger } from '@/lib/utils/logger';

const STORAGE_DIR = path.join(os.tmpdir(), 'flowpay-exports');

export type EstadoExportacionJob =
  | 'PENDIENTE'
  | 'PROCESANDO'
  | 'COMPLETADO'
  | 'ERROR';

export interface CrearExportacionJobInput {
  idusuario: number;
  tipo: string;
  filasEstimadas: number;
  idmandante?: number;
  parametros?: Record<string, unknown>;
  /** Filas ya materializadas en cliente (payload JSON). */
  filas?: Array<Record<string, unknown>>;
  columnas?: string[];
}

export interface ExportacionJobResumen {
  idexport: number;
  tipo: string;
  estado: string;
  filasEstimadas: number;
  progresoPct: number;
  nombreArchivo: string | null;
  error: string | null;
  createdAt: Date;
  finalizadoEn: Date | null;
}

async function asegurarDir(): Promise<void> {
  await mkdir(STORAGE_DIR, { recursive: true });
}

export function requiereExportAsync(filasEstimadas: number): boolean {
  return filasEstimadas >= EXPORT_ASYNC_ROW_THRESHOLD;
}

export async function crearExportacionJob(
  input: CrearExportacionJobInput,
): Promise<ExportacionJobResumen> {
  if (input.idmandante) {
    await requerirAccesoMandante(input.idusuario, input.idmandante);
  }

  const parametrosPayload = {
    ...(input.parametros ?? {}),
    columnas: input.columnas ?? [],
    filas: input.filas ?? [],
  };

  const job = await prisma.tbl_exportacion_job.create({
    data: {
      idusuario: input.idusuario,
      idmandante: input.idmandante ?? null,
      tipo: input.tipo,
      estado: 'PENDIENTE',
      filasEstimadas: input.filasEstimadas,
      parametros: JSON.stringify(parametrosPayload),
      progresoPct: 0,
    },
  });

  return {
    idexport: job.idexport,
    tipo: job.tipo,
    estado: job.estado,
    filasEstimadas: job.filasEstimadas,
    progresoPct: job.progresoPct,
    nombreArchivo: job.nombreArchivo,
    error: job.error,
    createdAt: job.createdAt,
    finalizadoEn: job.finalizadoEn,
  };
}

export async function obtenerExportacionJob(
  idexport: number,
  idusuario: number,
): Promise<ExportacionJobResumen | null> {
  const job = await prisma.tbl_exportacion_job.findFirst({
    where: { idexport, idusuario },
  });
  if (!job) {
    return null;
  }
  return {
    idexport: job.idexport,
    tipo: job.tipo,
    estado: job.estado,
    filasEstimadas: job.filasEstimadas,
    progresoPct: job.progresoPct,
    nombreArchivo: job.nombreArchivo,
    error: job.error,
    createdAt: job.createdAt,
    finalizadoEn: job.finalizadoEn,
  };
}

export async function obtenerRutaArchivoExport(
  idexport: number,
  idusuario: number,
): Promise<{ rutaAbsoluta: string; nombreArchivo: string } | null> {
  const job = await prisma.tbl_exportacion_job.findFirst({
    where: { idexport, idusuario, estado: 'COMPLETADO' },
  });
  if (!job?.rutaArchivo || !job.nombreArchivo) {
    return null;
  }
  return {
    rutaAbsoluta: path.join(STORAGE_DIR, job.rutaArchivo),
    nombreArchivo: job.nombreArchivo,
  };
}

function generarXlsxBuffer(
  columnas: string[],
  filas: Array<Record<string, unknown>>,
): Buffer {
  const headers =
    columnas.length > 0
      ? columnas
      : filas[0]
        ? Object.keys(filas[0])
        : ['info'];
  const aoa: unknown[][] = [headers];
  for (const fila of filas) {
    aoa.push(headers.map((h) => fila[h] ?? ''));
  }
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Reporte');
  return Buffer.from(
    XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
  );
}

async function procesarUnExport(idexport: number): Promise<boolean> {
  const claimed = await prisma.tbl_exportacion_job
    .update({
      where: { idexport, estado: 'PENDIENTE' },
      data: {
        estado: 'PROCESANDO',
        iniciadoEn: new Date(),
        progresoPct: 10,
      },
    })
    .catch(() => null);

  if (!claimed) {
    return false;
  }

  try {
    await asegurarDir();
    const raw = claimed.parametros
      ? (JSON.parse(claimed.parametros) as {
          columnas?: string[];
          filas?: Array<Record<string, unknown>>;
        })
      : { columnas: [], filas: [] };

    const columnas = raw.columnas ?? [];
    const filas = raw.filas ?? [];

    await prisma.tbl_exportacion_job.update({
      where: { idexport },
      data: { progresoPct: 40 },
    });

    const buffer = generarXlsxBuffer(columnas, filas);
    const nombreArchivo = `export_${claimed.tipo}_${idexport}.xlsx`;
    const rutaRelativa = `${claimed.idusuario}/${nombreArchivo}`;
    const rutaAbsoluta = path.join(STORAGE_DIR, rutaRelativa);
    await mkdir(path.dirname(rutaAbsoluta), { recursive: true });
    await writeFile(rutaAbsoluta, buffer);

    await prisma.tbl_exportacion_job.update({
      where: { idexport },
      data: {
        estado: 'COMPLETADO',
        progresoPct: 100,
        rutaArchivo: rutaRelativa,
        nombreArchivo,
        finalizadoEn: new Date(),
        // Libera payload pesado de parametros tras completar.
        parametros: null,
      },
    });
    return true;
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error desconocido';
    logger.error(
      'Error procesando exportacion async',
      err instanceof Error ? err : undefined,
      { idexport },
    );
    await prisma.tbl_exportacion_job.update({
      where: { idexport },
      data: {
        estado: 'ERROR',
        error: mensaje.slice(0, 2000),
        finalizadoEn: new Date(),
      },
    });
    return false;
  }
}

export async function procesarExportacionesPendientes(
  maxJobs = 2,
): Promise<{ procesados: number; errores: number }> {
  const pendientes = await prisma.tbl_exportacion_job.findMany({
    where: { estado: 'PENDIENTE' },
    orderBy: { createdAt: 'asc' },
    take: Math.max(1, maxJobs),
  });

  let procesados = 0;
  let errores = 0;
  for (const job of pendientes) {
    const ok = await procesarUnExport(job.idexport);
    if (ok) {
      procesados++;
    } else {
      errores++;
    }
  }
  return { procesados, errores };
}

export function dispararProcesamientoExportaciones(): void {
  setImmediate(() => {
    void procesarExportacionesPendientes().catch((err: unknown) => {
      logger.error(
        'Error en procesamiento de exportaciones',
        err instanceof Error ? err : undefined,
      );
    });
  });
}
