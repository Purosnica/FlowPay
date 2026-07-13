import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from '@/lib/cobranza/mandante-scope';
import { parseExcelSheet ,type  MapeoHoja } from './parse-excel-sheet';
import {
  CAMPOS_REQUERIDOS_REGISTROS,
  MAPEO_REGISTROS,
  MAPEO_PROMESAS,
} from './mapeo-gestiones';

import {
  resolverCodigoAccion,
  resolverCodigoResultado,
  resolverGestorPorNombre,
} from './import-helpers';
import {
  valorFecha,
  valorNumeroNullable,
  valorTexto,
} from './cartera-parse-helpers';
import type { ResultadoImportacionGestiones } from '@/types/cobranza';

export type { ResultadoImportacionGestiones };

export interface ImportarGestionesParams {
  idmandante: number;
  idusuario: number;
  buffer: Buffer;
  nombreArchivo: string;
  nombreHoja?: string;
  mapeo?: MapeoHoja;
}

export async function importarGestiones(
  params: ImportarGestionesParams,
): Promise<ResultadoImportacionGestiones> {
  await requerirAccesoMandante(params.idusuario, params.idmandante);

  const nombreHoja = params.nombreHoja ?? 'REGISTROS';
  const mapeo =
    params.mapeo ??
    (nombreHoja === 'PROMESAS' ? MAPEO_PROMESAS : MAPEO_REGISTROS);

  const parsed = parseExcelSheet(
    params.buffer,
    params.nombreArchivo,
    nombreHoja,
    mapeo,
    {
      camposRequeridos: CAMPOS_REQUERIDOS_REGISTROS,
      formatoFecha: 'DD/MM/YYYY',
    },
  );

  if (parsed.columnasFaltantes.length > 0) {
    throw new Error(
      `Columnas requeridas no detectadas en REGISTROS: ${parsed.columnasFaltantes.join(', ')}`,
    );
  }

  const resultado: ResultadoImportacionGestiones = {
    totalFilas: parsed.filas.length,
    gestionesCreadas: 0,
    omitidos: 0,
    errores: [],
  };

  for (const fila of parsed.filas) {
    try {
      const noPrestamo = valorTexto(fila.valores.noPrestamo);
      const nota = valorTexto(fila.valores.nota);
      const fechaGestion = valorFecha(fila.valores.fechaGestion) ?? new Date();

      if (!noPrestamo || !nota) {
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

      const idgestor =
        (await resolverGestorPorNombre(
          prisma,
          params.idmandante,
          valorTexto(fila.valores.nombreGestor),
        )) ?? params.idusuario;

      const idcodaccion = await resolverCodigoAccion(
        prisma,
        valorTexto(fila.valores.codigoAccion),
      );
      const idcodresultado = await resolverCodigoResultado(
        prisma,
        valorTexto(fila.valores.codigoResultado),
      );

      const codAccion = idcodaccion
        ? await prisma.tbl_codigo_accion.findUnique({
            where: { idcodaccion },
          })
        : null;

      // Idempotencia suave: evita reimportar la misma gestión.
      const duplicado = await prisma.tbl_gestion.findFirst({
        where: {
          idprestamo: prestamo.idprestamo,
          idgestor,
          nota,
          fechaGestion,
          deletedAt: null,
        },
        select: { idgestion: true },
      });
      if (duplicado) {
        resultado.omitidos++;
        continue;
      }

      await prisma.tbl_gestion.create({
        data: {
          idmandante: params.idmandante,
          idprestamo: prestamo.idprestamo,
          idgestor,
          idcodaccion: idcodaccion ?? undefined,
          idcodresultado: idcodresultado ?? undefined,
          fechaGestion,
          telefonoContacto: valorTexto(fila.valores.telefonoContacto),
          contactoTercero: codAccion?.esTercero ?? false,
          nota,
          razonMora: valorTexto(fila.valores.razonMora),
          montoPromesa: valorNumeroNullable(fila.valores.montoPromesa) ?? undefined,
          fechaPromesa: valorFecha(fila.valores.fechaPromesa) ?? undefined,
          fechaProximaGestion:
            valorFecha(fila.valores.fechaProximaGestion) ?? undefined,
          comentario: valorTexto(fila.valores.comentario),
        },
      });
      resultado.gestionesCreadas++;
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
