import type { PrismaClient } from '@prisma/client';
import { parseCarteraFile } from './parse-cartera-file';
import type {
  FilaCarteraParseada,
  ImportarCarteraParams,
  MapeoColumnas,
} from './types';

export interface DuplicadoArchivo {
  noPrestamo: string;
  filas: number[];
}

export interface DatosParseadosCartera {
  filas: FilaCarteraParseada[];
  mapeo: MapeoColumnas | undefined;
}

export function valorTexto(val: unknown): string | null {
  if (val === null || val === undefined) {
    return null;
  }
  const t = String(val).trim();
  return t.length > 0 ? t : null;
}

export function valorNumero(val: unknown, defaultVal = 0): number {
  if (typeof val === 'number' && !Number.isNaN(val)) {
    return val;
  }
  return defaultVal;
}

export function valorFecha(val: unknown): Date | null {
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val;
  }
  return null;
}

export function valorNumeroNullable(val: unknown): number | null {
  if (typeof val === 'number' && !Number.isNaN(val)) {
    return val;
  }
  return null;
}

export function valorNumeroPositivo(val: unknown): number | null {
  if (typeof val === 'number' && !Number.isNaN(val) && val > 0) {
    return val;
  }
  return null;
}

export function limpiarDocumento(doc: string): string {
  return doc.replace(/\D/g, '').trim() || doc.trim();
}

export function detectarDuplicadosArchivo(
  filas: FilaCarteraParseada[],
): DuplicadoArchivo[] {
  const mapa = new Map<string, number[]>();

  for (const fila of filas) {
    const noPrestamo = valorTexto(fila.valores.noPrestamo);
    if (!noPrestamo) {
      continue;
    }
    const existentes = mapa.get(noPrestamo) ?? [];
    existentes.push(fila.fila);
    mapa.set(noPrestamo, existentes);
  }

  return [...mapa.entries()]
    .filter(([, filasDup]) => filasDup.length > 1)
    .map(([noPrestamo, filasDup]) => ({ noPrestamo, filas: filasDup }));
}

export async function resolverPlantillaImportacion(
  db: PrismaClient,
  params: Pick<
    ImportarCarteraParams,
    'idmandante' | 'idplantillaImp' | 'mapeo'
  >,
): Promise<{ mapeo: MapeoColumnas | undefined; formatoFecha: string | null }> {
  if (params.mapeo !== undefined) {
    return { mapeo: params.mapeo, formatoFecha: null };
  }

  const plantillaWhere = params.idplantillaImp
    ? {
        idplantillaImp: params.idplantillaImp,
        idmandante: params.idmandante,
        deletedAt: null,
      }
    : {
        idmandante: params.idmandante,
        estado: true,
        deletedAt: null,
      };

  const plantilla = await db.tbl_plantilla_importacion.findFirst({
    where: plantillaWhere,
    orderBy: params.idplantillaImp ? undefined : { createdAt: 'desc' },
  });

  if (!plantilla) {
    return { mapeo: undefined, formatoFecha: null };
  }

  return {
    mapeo: JSON.parse(plantilla.mapeo) as MapeoColumnas,
    formatoFecha: plantilla.formatoFecha,
  };
}

export async function parsearArchivoCartera(
  params: Pick<
    ImportarCarteraParams,
    | 'buffer'
    | 'nombreArchivo'
    | 'nombreHoja'
    | 'mapeo'
    | 'idmandante'
    | 'idplantillaImp'
    | 'maxFilas'
  >,
  db: PrismaClient,
): Promise<DatosParseadosCartera> {
  const { mapeo, formatoFecha } = await resolverPlantillaImportacion(db, params);

  const parsed = parseCarteraFile(params.buffer, params.nombreArchivo, {
    nombreHoja: params.nombreHoja,
    mapeo,
    formatoFecha,
  });

  if (parsed.columnasFaltantes.length > 0) {
    throw new Error(
      `Columnas requeridas no detectadas: ${parsed.columnasFaltantes.join(', ')}`,
    );
  }

  const filas = params.maxFilas
    ? parsed.filas.slice(0, params.maxFilas)
    : parsed.filas;

  return { filas, mapeo };
}
