import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { parseExcelSheet } from './parse-excel-sheet';
import {
  CAMPOS_REQUERIDOS_PAGOS,
  MAPEO_PAGOS,
} from './mapeo-gestiones';
import { aplicarPagoAlPrestamo } from '@/lib/cobranza/pago-aplicacion-service';
import { IMPORT_TRANSACTION_OPTIONS } from './import-transaction-options';
import {
  cargarCacheGestoresMandante,
  resolverGestorPorNombreCache,
} from './import-helpers';
import {
  valorFecha,
  valorNumeroPositivo,
  valorTexto,
} from './cartera-parse-helpers';
import type { ResultadoImportacionPagos } from '@/types/cobranza';

export type { ResultadoImportacionPagos };

export interface ImportarPagosParams {
  idmandante: number;
  idusuario: number;
  buffer: Buffer;
  nombreArchivo: string;
  nombreHoja?: string;
}

function resolverIdGestorPago(
  nombreGestor: string | null,
  idgestorPrestamo: number | null,
  idusuarioImportador: number,
  cacheGestores: Awaited<ReturnType<typeof cargarCacheGestoresMandante>>,
): number {
  const porNombre = resolverGestorPorNombreCache(cacheGestores, nombreGestor);
  if (porNombre) {
    return porNombre;
  }
  if (idgestorPrestamo) {
    return idgestorPrestamo;
  }
  return idusuarioImportador;
}

export async function importarPagosHistoricos(
  params: ImportarPagosParams,
): Promise<ResultadoImportacionPagos> {
  await requerirAccesoMandante(params.idusuario, params.idmandante);

  const parsed = parseExcelSheet(
    params.buffer,
    params.nombreArchivo,
    params.nombreHoja ?? 'PAGOS',
    MAPEO_PAGOS,
    {
      camposRequeridos: CAMPOS_REQUERIDOS_PAGOS,
      formatoFecha: 'DD/MM/YYYY',
    },
  );

  if (parsed.columnasFaltantes.length > 0) {
    throw new Error(
      `Columnas requeridas no detectadas en PAGOS: ${parsed.columnasFaltantes.join(', ')}`,
    );
  }

  const cacheGestores = await cargarCacheGestoresMandante(
    prisma,
    params.idmandante,
  );

  const resultado: ResultadoImportacionPagos = {
    totalFilas: parsed.filas.length,
    pagosCreados: 0,
    omitidos: 0,
    errores: [],
  };

  for (const fila of parsed.filas) {
    try {
      const noPrestamo = valorTexto(fila.valores.noPrestamo);
      const monto = valorNumeroPositivo(fila.valores.monto);
      const fechaPago = valorFecha(fila.valores.fechaPago);
      const nombreGestor = valorTexto(fila.valores.nombreGestor);

      if (!noPrestamo || !monto || !fechaPago) {
        resultado.omitidos++;
        continue;
      }

      const prestamo = await prisma.tbl_prestamo.findFirst({
        where: {
          idmandante: params.idmandante,
          noPrestamo,
          deletedAt: null,
        },
      });

      if (!prestamo) {
        resultado.omitidos++;
        continue;
      }

      const idgestor = resolverIdGestorPago(
        nombreGestor,
        prestamo.idgestorAsignado,
        params.idusuario,
        cacheGestores,
      );

      await prisma.$transaction(async (tx) => {
        await tx.tbl_pago.create({
          data: {
            idmandante: params.idmandante,
            idprestamo: prestamo.idprestamo,
            idgestor,
            fechaPago,
            monto,
            moneda: prestamo.moneda,
            medio: 'IMPORTADO',
            aplicado: true,
          },
        });

        await aplicarPagoAlPrestamo(tx, {
          idprestamo: prestamo.idprestamo,
          monto,
          fechaPago,
        });
      }, IMPORT_TRANSACTION_OPTIONS);
      resultado.pagosCreados++;
    } catch (error) {
      resultado.errores.push({
        fila: fila.fila,
        mensaje:
          error instanceof Error ? error.message : 'Error desconocido en fila',
      });
    }
  }

  return resultado;
}
