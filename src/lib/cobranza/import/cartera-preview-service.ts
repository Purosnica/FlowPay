import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { decimalToNumber } from '@/lib/cobranza/decimal-utils';
import {
  detectarDuplicadosArchivo,
  limpiarDocumento,
  parsearArchivoCartera,
  valorNumero,
  valorTexto,
} from './cartera-parse-helpers';
import type { ImportarCarteraParams } from './types';

export interface VistaPreviaImportacionCartera {
  mandante: { idmandante: number; nombre: string };
  totalProcesados: number;
  prestamosNuevos: number;
  prestamosExistentes: number;
  prestamosSaldoActualizado: number;
  prestamosConErrores: number;
  omitidos: number;
  saldoTotalCartera: number;
  prestamosAusentes: number;
  duplicadosArchivo: { noPrestamo: string; filas: number[] }[];
  errores: { fila: number; mensaje: string }[];
  puedeImportar: boolean;
}

const TAMANO_LOTE_PRECARGA = 200;

async function precargarPrestamosConSaldo(
  db: PrismaClient,
  idmandante: number,
  numerosPrestamo: string[],
): Promise<Map<string, { idprestamo: number; saldoTotal: number }>> {
  const mapa = new Map<string, { idprestamo: number; saldoTotal: number }>();

  for (let i = 0; i < numerosPrestamo.length; i += TAMANO_LOTE_PRECARGA) {
    const lote = numerosPrestamo.slice(i, i + TAMANO_LOTE_PRECARGA);
    const filas = await db.tbl_prestamo.findMany({
      where: {
        idmandante,
        noPrestamo: { in: lote },
        deletedAt: null,
      },
      select: { idprestamo: true, noPrestamo: true, saldoTotal: true },
    });
    for (const fila of filas) {
      mapa.set(fila.noPrestamo, {
        idprestamo: fila.idprestamo,
        saldoTotal: decimalToNumber(fila.saldoTotal),
      });
    }
  }

  return mapa;
}

export async function previsualizarImportacionCartera(
  params: ImportarCarteraParams,
): Promise<VistaPreviaImportacionCartera> {
  await requerirAccesoMandante(params.idusuario, params.idmandante);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante: params.idmandante, deletedAt: null },
    select: { idmandante: true, nombre: true },
  });

  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const campana = await prisma.tbl_campana.findFirst({
    where: {
      idcampana: params.idcampana,
      idmandante: params.idmandante,
      deletedAt: null,
    },
  });

  if (!campana) {
    throw new Error('Campaña no encontrada para el mandante indicado.');
  }

  const { filas } = await parsearArchivoCartera(params, prisma);
  const duplicadosArchivo = detectarDuplicadosArchivo(filas);

  const prestamosUnicos = [
    ...new Set(
      filas
        .map((f) => valorTexto(f.valores.noPrestamo))
        .filter((n): n is string => !!n),
    ),
  ];

  const cachePrestamos = await precargarPrestamosConSaldo(
    prisma,
    params.idmandante,
    prestamosUnicos,
  );

  let prestamosNuevos = 0;
  let prestamosExistentes = 0;
  let prestamosSaldoActualizado = 0;
  let omitidos = 0;
  let saldoTotalCartera = 0;
  const errores: { fila: number; mensaje: string }[] = [];

  for (const fila of filas) {
    const noPrestamo = valorTexto(fila.valores.noPrestamo);
    const numerodocumentoRaw = valorTexto(fila.valores.numerodocumento);
    const nombreCliente = valorTexto(fila.valores.nombreCliente);

    if (!noPrestamo || !numerodocumentoRaw || !nombreCliente) {
      omitidos++;
      continue;
    }

    if (duplicadosArchivo.some((d) => d.noPrestamo === noPrestamo)) {
      errores.push({
        fila: fila.fila,
        mensaje: `Préstamo duplicado en archivo: ${noPrestamo}`,
      });
      continue;
    }

    const saldoNuevo = valorNumero(fila.valores.saldoTotal);
    saldoTotalCartera += saldoNuevo;

    const existente = cachePrestamos.get(noPrestamo);
    if (existente) {
      prestamosExistentes++;
      if (Math.abs(existente.saldoTotal - saldoNuevo) > 0.009) {
        prestamosSaldoActualizado++;
      }
    } else {
      prestamosNuevos++;
    }

    if (!limpiarDocumento(numerodocumentoRaw)) {
      errores.push({
        fila: fila.fila,
        mensaje: 'Documento de cliente inválido.',
      });
    }
  }

  const prestamosEnArchivo = new Set(prestamosUnicos);
  const prestamosActivosMandante = await prisma.tbl_prestamo.findMany({
    where: {
      idmandante: params.idmandante,
      deletedAt: null,
      estado: { notIn: ['Cancelado', 'Finalizado'] },
    },
    select: { noPrestamo: true },
  });

  const prestamosAusentes = prestamosActivosMandante.filter(
    (p) => !prestamosEnArchivo.has(p.noPrestamo),
  ).length;

  const tieneDuplicados = duplicadosArchivo.length > 0;

  return {
    mandante,
    totalProcesados: filas.length,
    prestamosNuevos,
    prestamosExistentes,
    prestamosSaldoActualizado,
    prestamosConErrores: errores.length,
    omitidos,
    saldoTotalCartera: Math.round(saldoTotalCartera * 100) / 100,
    prestamosAusentes,
    duplicadosArchivo,
    errores,
    puedeImportar: !tieneDuplicados,
  };
}
