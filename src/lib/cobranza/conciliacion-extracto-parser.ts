import * as XLSX from 'xlsx';

export type FilaExtractoParseada = {
  fechaOperacion: Date;
  fechaValor?: Date | null;
  referencia?: string | null;
  descripcion?: string | null;
  debito?: string;
  credito?: string;
  monto: string;
  moneda?: string;
};

type Row = Record<string, unknown>;

const norm = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

function valor(row: Row, aliases: string[]): unknown {
  const wanted = new Set(aliases.map(norm));
  for (const [key, v] of Object.entries(row)) {
    if (wanted.has(norm(key))) return v;
  }
  return undefined;
}

function fechaDesde(valorFecha: unknown): Date | null {
  if (valorFecha instanceof Date && !Number.isNaN(valorFecha.getTime())) return valorFecha;
  if (typeof valorFecha === 'number' && Number.isFinite(valorFecha)) {
    const parsed = XLSX.SSF.parse_date_code(valorFecha);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H ?? 0, parsed.M ?? 0, Math.floor(parsed.S ?? 0)));
  }
  if (typeof valorFecha === 'string' && valorFecha.trim()) {
    const raw = valorFecha.trim();
    const dmy = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(raw);
    if (dmy) {
      const d = new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function decimalString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized =
    typeof value === 'string'
      ? value.replace(/\s/g, '').replace(/,/g, '')
      : value;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

function texto(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s || null;
}

export function parsearExtractoBancario(
  buffer: Buffer,
  options?: { nombreHoja?: string; monedaDefault?: string },
): { lineas: FilaExtractoParseada[]; errores: string[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName =
    options?.nombreHoja && workbook.SheetNames.includes(options.nombreHoja)
      ? options.nombreHoja
      : workbook.SheetNames[0];

  if (!sheetName) {
    return { lineas: [], errores: ['El archivo no contiene hojas.'] };
  }

  const rows = XLSX.utils.sheet_to_json<Row>(workbook.Sheets[sheetName], {
    defval: null,
    raw: true,
  });

  const lineas: FilaExtractoParseada[] = [];
  const errores: string[] = [];

  rows.forEach((row, index) => {
    const fila = index + 2;
    const fechaOperacion = fechaDesde(
      valor(row, ['fecha', 'fechaoperacion', 'fecha transaccion', 'fecha movimiento']),
    );
    const fechaValorRaw = valor(row, ['fechavalor', 'fecha valor']);
    const fechaValor = fechaValorRaw == null ? null : fechaDesde(fechaValorRaw);

    const debito = decimalString(valor(row, ['debito', 'débito', 'cargo']));
    const credito = decimalString(valor(row, ['credito', 'crédito', 'abono']));
    let monto = decimalString(valor(row, ['monto', 'importe', 'valor']));

    if (!monto) {
      const creditoN = Number(credito ?? 0);
      const debitoN = Number(debito ?? 0);
      const derivado = creditoN !== 0 ? Math.abs(creditoN) : Math.abs(debitoN);
      if (derivado > 0) monto = derivado.toFixed(2);
    }

    if (!fechaOperacion) errores.push(`Fila ${fila}: fecha de operación inválida o ausente.`);
    if (fechaValorRaw != null && !fechaValor) errores.push(`Fila ${fila}: fecha valor inválida.`);
    if (!monto || Number(monto) <= 0) errores.push(`Fila ${fila}: monto inválido, cero o ausente.`);

    if (!fechaOperacion || !monto || Number(monto) <= 0) return;

    lineas.push({
      fechaOperacion,
      fechaValor,
      referencia: texto(valor(row, ['referencia', 'referenciabancaria', 'numero referencia', 'nro referencia', 'ref'])),
      descripcion: texto(valor(row, ['descripcion', 'descripción', 'concepto', 'detalle'])),
      debito: debito ?? '0.00',
      credito: credito ?? '0.00',
      monto,
      moneda:
        texto(valor(row, ['moneda', 'currency']))?.toUpperCase() ??
        options?.monedaDefault?.toUpperCase(),
    });
  });

  if (rows.length === 0) errores.push('El archivo no contiene filas de datos.');
  return { lineas, errores };
}
