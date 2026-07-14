import * as XLSX from 'xlsx';

export type ExcelCellValue = string | number | boolean | null | undefined;

export type ExcelColumn = {
  header: string;
  /** Ancho sugerido en caracteres. */
  width?: number;
  /** Formato numérico Excel (p. ej. '#,##0.00'). */
  numFmt?: string;
};

export type ExcelMetaRow = {
  label: string;
  value: ExcelCellValue;
};

export type ExcelSheetSpec = {
  /** Nombre de hoja (máx. 31 caracteres). */
  name: string;
  /** Título opcional en la primera fila. */
  title?: string;
  /** Pares indicador/valor antes de la tabla. */
  meta?: ExcelMetaRow[];
  /** Vacío si la hoja solo tiene título/meta (resumen). */
  columns?: ExcelColumn[];
  rows?: ExcelCellValue[][];
};

const MAX_COL_WIDTH = 48;
const MIN_COL_WIDTH = 10;

function sheetNameSafe(name: string): string {
  return name.replace(/[\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Hoja1';
}

function fileNameSafe(name: string): string {
  return name.replace(/[^\w\-]+/g, '_').slice(0, 80);
}

function cellAddress(row: number, col: number): string {
  return XLSX.utils.encode_cell({ r: row, c: col });
}

function estimateWidth(value: ExcelCellValue): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return String(value).length;
}

function buildColumnWidths(
  columns: ExcelColumn[],
  rows: ExcelCellValue[][],
): XLSX.ColInfo[] {
  return columns.map((col, colIndex) => {
    let maxLen = col.header.length;
    for (const row of rows) {
      maxLen = Math.max(maxLen, estimateWidth(row[colIndex]));
    }
    const computed = Math.min(
      MAX_COL_WIDTH,
      Math.max(MIN_COL_WIDTH, maxLen + 2),
    );
    return { wch: col.width ?? computed };
  });
}

/**
 * Construye una hoja con título/meta opcionales, encabezados,
 * anchos, autofilter y formatos numéricos.
 */
export function buildFormattedSheet(spec: ExcelSheetSpec): XLSX.WorkSheet {
  const aoa: ExcelCellValue[][] = [];

  if (spec.title) {
    aoa.push([spec.title]);
    aoa.push([]);
  }

  if (spec.meta && spec.meta.length > 0) {
    for (const row of spec.meta) {
      aoa.push([row.label, row.value ?? '']);
    }
    aoa.push([]);
  }

  const columns = spec.columns ?? [];
  const rows = spec.rows ?? [];
  const colCount = columns.length;
  const hasTable = colCount > 0;
  const headerRowIndex = aoa.length;

  if (hasTable) {
    aoa.push(columns.map((c) => c.header));
    for (const row of rows) {
      const padded = columns.map((_, i) => row[i] ?? '');
      aoa.push(padded);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: false });

  if (hasTable) {
    const dataStart = headerRowIndex + 1;
    const dataEnd = headerRowIndex + rows.length;
    const lastCol = XLSX.utils.encode_col(colCount - 1);
    const filterEnd = Math.max(dataEnd, headerRowIndex);
    ws['!autofilter'] = {
      ref: `A${headerRowIndex + 1}:${lastCol}${filterEnd + 1}`,
    };

    for (let r = dataStart; r <= dataEnd; r += 1) {
      for (let c = 0; c < colCount; c += 1) {
        const fmt = columns[c]?.numFmt;
        if (!fmt) {
          continue;
        }
        const addr = cellAddress(r, c);
        const cell = ws[addr] as XLSX.CellObject | undefined;
        if (!cell || cell.t !== 'n') {
          continue;
        }
        cell.z = fmt;
      }
    }

    ws['!cols'] = buildColumnWidths(columns, rows);
  } else {
    ws['!cols'] = [{ wch: 28 }, { wch: 22 }];
  }

  if (spec.title) {
    ws['!merges'] = [
      ...(ws['!merges'] ?? []),
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: Math.max(colCount - 1, 1) },
      },
    ];
  }

  if (hasTable) {
    (ws as XLSX.WorkSheet & { '!freeze'?: { xSplit: number; ySplit: number } })[
      '!freeze'
    ] = { xSplit: 0, ySplit: headerRowIndex + 1 };
  }

  return ws;
}

/**
 * Genera y descarga un libro .xlsx con una o más hojas formateadas.
 */
export function downloadWorkbook(
  sheets: ExcelSheetSpec[],
  filename: string,
): void {
  const book = XLSX.utils.book_new();

  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(
      book,
      buildFormattedSheet(sheet),
      sheetNameSafe(sheet.name),
    );
  }

  const safe = fileNameSafe(
    filename.endsWith('.xlsx') ? filename.slice(0, -5) : filename,
  );
  XLSX.writeFile(book, `${safe}.xlsx`);
}

export const XLSX_FMT = {
  money: '#,##0.00',
  integer: '#,##0',
  percent: '0.00',
} as const;
