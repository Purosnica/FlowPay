import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { decimalToNumber } from '@/lib/cobranza/decimal-utils';
import { calcularDesgloseSaldo } from '@/lib/cobranza/prestamo-saldo-desglose';
import {
  obtenerDescuentosAcuerdoPorPrestamos,
  obtenerTotalesPagosPorPrestamos,
} from '@/lib/cobranza/prestamo-saldo-desglose-service';
import { extraerDatosFinancierosCartera } from './cartera-financiero-helpers';
import {
  detectarDuplicadosArchivo,
  limpiarDocumento,
  parsearArchivoCartera,
  valorTexto,
} from './cartera-parse-helpers';
import type { ImportarCarteraParams } from './types';
import type {
  FilaDesglosePreview,
  ResumenDesglosePreview,
} from '@/types/cobranza';

export type { FilaDesglosePreview, ResumenDesglosePreview };

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
  desgloseFilas: FilaDesglosePreview[];
  resumenDesglose: ResumenDesglosePreview;
}

const TAMANO_LOTE_PRECARGA = 200;
const MUESTRA_DESGLOSE_PREVIEW = 30;

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

  const idsPrestamoExistentes = [...cachePrestamos.values()].map(
    (p) => p.idprestamo,
  );
  const [pagosPorPrestamo, descuentosPorPrestamo] = await Promise.all([
    obtenerTotalesPagosPorPrestamos(prisma, idsPrestamoExistentes),
    obtenerDescuentosAcuerdoPorPrestamos(prisma, idsPrestamoExistentes),
  ]);

  let prestamosNuevos = 0;
  let prestamosExistentes = 0;
  let prestamosSaldoActualizado = 0;
  let omitidos = 0;
  let saldoTotalCartera = 0;
  const errores: { fila: number; mensaje: string }[] = [];
  const desgloseTodasFilas: FilaDesglosePreview[] = [];

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

    const datosFinancieros = extraerDatosFinancierosCartera(fila);
    saldoTotalCartera += datosFinancieros.saldoTotal;

    const existente = cachePrestamos.get(noPrestamo);
    if (existente) {
      prestamosExistentes++;
      if (
        Math.abs(existente.saldoTotal - datosFinancieros.saldoTotal) > 0.009
      ) {
        prestamosSaldoActualizado++;
      }
    } else {
      prestamosNuevos++;
    }

    const montoDescuento = existente
      ? (descuentosPorPrestamo.get(existente.idprestamo) ?? 0)
      : 0;
    const totalPagosDb = existente
      ? (pagosPorPrestamo.get(existente.idprestamo) ?? 0)
      : 0;
    const totalPagos =
      datosFinancieros.totalPagosArchivo > 0
        ? datosFinancieros.totalPagosArchivo
        : totalPagosDb;

    const desglose = calcularDesgloseSaldo({
      montoPrestamo: datosFinancieros.montoPrestamo,
      interes: datosFinancieros.interes,
      gestionCobranza: datosFinancieros.gestionCobranza,
      comisionCav: datosFinancieros.comisionCav,
      comisionInsitu: datosFinancieros.comisionInsitu,
      mantenimientoValor: datosFinancieros.mantenimientoValor,
      seguroSvsd: datosFinancieros.seguroSvsd,
      cargosAdmin: datosFinancieros.cargosAdmin,
      devolucionSaldoFavor: datosFinancieros.devolucionSaldoFavor,
      descuentosArchivo: datosFinancieros.descuentosArchivo,
      interesMoratorio: datosFinancieros.interesMoratorio,
      totalPagosAplicados: totalPagos,
      saldoRegistrado: datosFinancieros.saldoTotal,
      descuentoAcuerdoVigente: montoDescuento,
    });

    desgloseTodasFilas.push({
      fila: fila.fila,
      noPrestamo,
      subtotalComponentes: desglose.subtotalComponentes,
      interesMoratorio: desglose.interesMoratorio,
      baseAcuerdo: desglose.baseAcuerdo,
      totalPagosAplicados: desglose.totalPagosAplicados,
      saldoCalculado: desglose.saldoCalculado,
      saldoArchivo: desglose.saldoRegistrado,
      diferencia: desglose.diferencia,
      cuadra: desglose.cuadra,
    });

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

  const resumenDesglose: ResumenDesglosePreview = {
    filasAnalizadas: desgloseTodasFilas.length,
    filasCuadran: desgloseTodasFilas.filter((f) => f.cuadra).length,
    filasConDiferencia: desgloseTodasFilas.filter((f) => !f.cuadra).length,
    totalSubtotalComponentes: desgloseTodasFilas.reduce(
      (s, f) => s + f.subtotalComponentes,
      0,
    ),
    totalInteresMoratorio: desgloseTodasFilas.reduce(
      (s, f) => s + f.interesMoratorio,
      0,
    ),
    totalPagos: desgloseTodasFilas.reduce(
      (s, f) => s + f.totalPagosAplicados,
      0,
    ),
    totalSaldoCalculado: desgloseTodasFilas.reduce(
      (s, f) => s + f.saldoCalculado,
      0,
    ),
    totalSaldoArchivo: desgloseTodasFilas.reduce(
      (s, f) => s + f.saldoArchivo,
      0,
    ),
  };

  const filasConDiferencia = desgloseTodasFilas.filter((f) => !f.cuadra);
  const desgloseFilas =
    filasConDiferencia.length > 0
      ? filasConDiferencia.slice(0, MUESTRA_DESGLOSE_PREVIEW)
      : desgloseTodasFilas.slice(0, MUESTRA_DESGLOSE_PREVIEW);

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
    desgloseFilas,
    resumenDesglose,
  };
}
