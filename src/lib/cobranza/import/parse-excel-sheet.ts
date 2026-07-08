import * as XLSX from 'xlsx';
import { normalizeHeader } from './normalize-header';
import { parseEntero, parseFecha, parseNumero, parseTexto } from './parse-value';

export type TipoColumna = 'texto' | 'numero' | 'entero' | 'fecha';

export type MapeoHoja = Record<string, { columna: string; tipo: TipoColumna }>;

export interface FilaHojaParseada {
  fila: number;
  valores: Record<string, string | number | Date | null>;
}

export interface ParseExcelSheetResult {
  filas: FilaHojaParseada[];
  columnasDetectadas: Record<string, string>;
  columnasFaltantes: string[];
}

function convertir(tipo: TipoColumna, raw: unknown, formatoFecha?: string | null) {
  switch (tipo) {
    case 'numero':
      return parseNumero(raw);
    case 'entero':
      return parseEntero(raw);
    case 'fecha':
      return parseFecha(raw, formatoFecha);
    default:
      return parseTexto(raw);
  }
}

export function parseExcelSheet(
  buffer: Buffer,
  nombreArchivo: string,
  nombreHoja: string,
  mapeo: MapeoHoja,
  options?: { maxFilas?: number; formatoFecha?: string | null; camposRequeridos?: string[] },
): ParseExcelSheetResult {
  const extension = nombreArchivo.split('.').pop()?.toLowerCase() ?? '';
  const esCsv = extension === 'csv';
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    raw: false,
    sheetRows: options?.maxFilas,
  });

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
    throw new Error(`La hoja "${nombreHoja}" no contiene filas de datos.`);
  }

  const headerRow = matriz[0].map((h) => normalizeHeader(String(h ?? '')));
  const indices: Record<string, number> = {};
  const columnasDetectadas: Record<string, string> = {};

  for (const [campo, config] of Object.entries(mapeo)) {
    const preferido = normalizeHeader(config.columna);
    const idx = headerRow.findIndex(
      (h) => h === preferido || h.includes(preferido) || preferido.includes(h),
    );
    if (idx >= 0) {
      indices[campo] = idx;
      columnasDetectadas[campo] = String(matriz[0][idx] ?? '');
    }
  }

  const requeridos = options?.camposRequeridos ?? [];
  const columnasFaltantes = requeridos.filter((c) => indices[c] === undefined);

  const filas: FilaHojaParseada[] = [];
  for (let i = 1; i < matriz.length; i++) {
    const row = matriz[i];
    if (!row || row.every((c) => c === null || String(c).trim() === '')) {
      continue;
    }
    const valores: FilaHojaParseada['valores'] = {};
    for (const [campo, idx] of Object.entries(indices)) {
      valores[campo] = convertir(
        mapeo[campo].tipo,
        row[idx],
        options?.formatoFecha,
      );
    }
    filas.push({ fila: i + 1, valores });
  }

  return { filas, columnasDetectadas, columnasFaltantes };
}
