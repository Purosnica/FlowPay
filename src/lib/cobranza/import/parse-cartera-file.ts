import * as XLSX from 'xlsx';
import { normalizeHeader } from './normalize-header';
import { ALIAS_COLUMNAS, MAPEO_CREDICOMPRAS } from './mapeo-default';
import type {
  CampoCarteraImport,
  FilaCarteraParseada,
  MapeoColumnas,
} from './types';
import {
  parseEntero,
  parseFecha,
  parseMoneda,
  parseNumero,
  parseTexto,
} from './parse-value';

const CAMPOS_REQUERIDOS: CampoCarteraImport[] = [
  'noPrestamo',
  'numerodocumento',
  'nombreCliente',
  'saldoTotal',
];

/**
 * Longitud mínima de un alias para permitir coincidencia parcial.
 * Evita que encabezados muy cortos (p. ej. "F") coincidan por accidente.
 */
const LONGITUD_MINIMA_PARCIAL = 4;

function candidatosCampo(
  campo: CampoCarteraImport,
  mapeo: MapeoColumnas,
): string[] {
  const preferido = mapeo[campo];
  const lista = [
    ...(preferido ? [preferido] : []),
    ...(ALIAS_COLUMNAS[campo] ?? []),
  ].map(normalizeHeader);
  return [...new Set(lista)].filter((c) => c.length > 0);
}

function buscarIndiceExacto(headers: string[], candidatos: string[]): number {
  for (const candidato of candidatos) {
    const idx = headers.findIndex((h) => h === candidato);
    if (idx >= 0) {
      return idx;
    }
  }
  return -1;
}

/**
 * Coincidencia parcial: el encabezado debe CONTENER el alias.
 * Solo considera columnas no reclamadas por otro campo, de modo que un alias
 * genérico (p. ej. "vencimiento") no pueda robar una columna ya asignada
 * (p. ej. "DiasMoraVencimiento").
 */
function buscarIndiceParcial(
  headers: string[],
  candidatos: string[],
  ocupados: Set<number>,
): number {
  for (const candidato of candidatos) {
    if (candidato.length < LONGITUD_MINIMA_PARCIAL) {
      continue;
    }
    const idx = headers.findIndex(
      (h, i) => !ocupados.has(i) && h.length > 0 && h.includes(candidato),
    );
    if (idx >= 0) {
      return idx;
    }
  }
  return -1;
}

function convertirValor(
  campo: CampoCarteraImport,
  raw: unknown,
  formatoFecha?: string | null,
): string | number | Date | null {
  switch (campo) {
    case 'saldoTotal':
    case 'interesMoratorio':
    case 'montoPrestamo':
    case 'interes':
    case 'comisionCav':
    case 'comisionInsitu':
    case 'mantenimientoValor':
    case 'gestionCobranza':
    case 'seguroSvsd':
    case 'cargosAdmin':
    case 'tipoCambio':
      return parseNumero(raw);
    case 'diasMora':
    case 'plazoMeses':
      return parseEntero(raw);
    case 'fechaVencimiento':
    case 'fechaPrestamo':
    case 'ultimaFechaPago':
      return parseFecha(raw, formatoFecha);
    case 'moneda':
      return parseMoneda(raw);
    default:
      return parseTexto(raw);
  }
}

const CAMPOS_FECHA: ReadonlySet<CampoCarteraImport> = new Set([
  'fechaVencimiento',
  'fechaPrestamo',
  'ultimaFechaPago',
]);

const MUESTRA_VALIDACION_FECHA = 25;

function valorEsFecha(raw: unknown, formatoFecha?: string | null): boolean {
  if (raw instanceof Date) {
    return !Number.isNaN(raw.getTime());
  }
  // Un número suelto no se acepta como fecha: evita interpretar días de mora
  // o montos como seriales de fecha de Excel.
  if (typeof raw !== 'string') {
    return false;
  }
  const texto = raw.trim();
  if (!/\d/.test(texto) || !/[/\-.]/.test(texto)) {
    return false;
  }
  const parsed = parseFecha(texto, formatoFecha);
  return parsed instanceof Date && !Number.isNaN(parsed.getTime());
}

/**
 * Verifica que una columna asignada a un campo de fecha realmente contenga
 * valores tipo fecha en una muestra de filas. Sirve de salvaguarda ante
 * encabezados ambiguos que apunten a columnas numéricas.
 */
function columnaContieneFechas(
  matriz: (string | number | null)[][],
  idx: number,
  formatoFecha?: string | null,
): boolean {
  let evaluadas = 0;
  let validas = 0;

  for (
    let i = 1;
    i < matriz.length && evaluadas < MUESTRA_VALIDACION_FECHA;
    i++
  ) {
    const raw = matriz[i]?.[idx];
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      continue;
    }
    evaluadas++;
    if (valorEsFecha(raw, formatoFecha)) {
      validas++;
    }
  }

  if (evaluadas === 0) {
    return true;
  }
  return validas / evaluadas >= 0.5;
}

export interface ParseCarteraFileResult {
  filas: FilaCarteraParseada[];
  columnasDetectadas: Partial<Record<CampoCarteraImport, string>>;
  columnasFaltantes: CampoCarteraImport[];
}

export function parseCarteraFile(
  buffer: Buffer,
  nombreArchivo: string,
  options?: {
    nombreHoja?: string;
    mapeo?: MapeoColumnas;
    formatoFecha?: string | null;
    maxFilas?: number;
  },
): ParseCarteraFileResult {
  const extension = nombreArchivo.split('.').pop()?.toLowerCase() ?? '';
  const esCsv = extension === 'csv';
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    raw: false,
    sheetRows: options?.maxFilas,
  });

  const nombreHoja =
    options?.nombreHoja ??
    (workbook.SheetNames.includes('data')
      ? 'data'
      : workbook.SheetNames[0]);

  const sheet = workbook.Sheets[nombreHoja];
  if (!sheet) {
    throw new Error(`Hoja "${nombreHoja}" no encontrada en el archivo.`);
  }

  const matriz = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: esCsv,
  });

  if (matriz.length < 2) {
    throw new Error('El archivo no contiene filas de datos.');
  }

  const headerRow = matriz[0].map((h) => normalizeHeader(String(h ?? '')));
  const mapeo = { ...MAPEO_CREDICOMPRAS, ...options?.mapeo };

  const indices: Partial<Record<CampoCarteraImport, number>> = {};
  const columnasDetectadas: Partial<Record<CampoCarteraImport, string>> = {};
  const ocupados = new Set<number>();

  const campos = Object.keys(ALIAS_COLUMNAS) as CampoCarteraImport[];
  const candidatosPorCampo = new Map<CampoCarteraImport, string[]>(
    campos.map((campo) => [campo, candidatosCampo(campo, mapeo)]),
  );

  // Fase 1: coincidencia exacta (prioritaria y sin ambigüedad).
  for (const campo of campos) {
    const idx = buscarIndiceExacto(headerRow, candidatosPorCampo.get(campo) ?? []);
    if (idx >= 0 && !ocupados.has(idx)) {
      indices[campo] = idx;
      ocupados.add(idx);
    }
  }

  // Fase 2: coincidencia parcial solo sobre columnas aún no reclamadas.
  for (const campo of campos) {
    if (indices[campo] !== undefined) {
      continue;
    }
    const idx = buscarIndiceParcial(
      headerRow,
      candidatosPorCampo.get(campo) ?? [],
      ocupados,
    );
    if (idx >= 0) {
      indices[campo] = idx;
      ocupados.add(idx);
    }
  }

  // Salvaguarda: una columna de fecha debe contener valores tipo fecha.
  // Evita que una columna numérica mal asignada (p. ej. días de mora) se
  // interprete como fecha de vencimiento y produzca moras absurdas.
  for (const campo of campos) {
    const idx = indices[campo];
    if (
      idx !== undefined &&
      CAMPOS_FECHA.has(campo) &&
      !columnaContieneFechas(matriz, idx, options?.formatoFecha)
    ) {
      delete indices[campo];
      ocupados.delete(idx);
    }
  }

  for (const campo of campos) {
    const idx = indices[campo];
    if (idx !== undefined) {
      columnasDetectadas[campo] = String(matriz[0][idx] ?? '');
    }
  }

  const columnasFaltantes = CAMPOS_REQUERIDOS.filter(
    (c) => indices[c] === undefined,
  );

  const filas: FilaCarteraParseada[] = [];

  for (let i = 1; i < matriz.length; i++) {
    const row = matriz[i];
    if (!row || row.every((c) => c === null || String(c).trim() === '')) {
      continue;
    }

    const valores: FilaCarteraParseada['valores'] = {};
    for (const [campo, idx] of Object.entries(indices) as [
      CampoCarteraImport,
      number,
    ][]) {
      valores[campo] = convertirValor(
        campo,
        row[idx],
        options?.formatoFecha,
      );
    }

    filas.push({ fila: i + 1, valores });
  }

  return { filas, columnasDetectadas, columnasFaltantes };
}
