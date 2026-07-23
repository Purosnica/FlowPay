/**
 * Conversión de valores crudos del Excel a tipos de dominio.
 */

export function parseNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }
  if (typeof valor === 'number' && !Number.isNaN(valor)) {
    return valor;
  }
  const texto = String(valor)
    .replace(/\s/g, '')
    .replace(/C\$|NIO|\$/gi, '')
    .replace(/,/g, '');
  const n = Number.parseFloat(texto);
  return Number.isNaN(n) ? null : n;
}

export function parseEntero(valor: unknown): number | null {
  const n = parseNumero(valor);
  return n === null ? null : Math.trunc(n);
}

export function parseTexto(valor: unknown): string | null {
  if (valor === null || valor === undefined) {
    return null;
  }
  const texto = String(valor).trim();
  return texto.length > 0 ? texto : null;
}

function expandirAnioDosDigitos(anio: number): number {
  if (anio >= 100) {
    return anio;
  }
  return anio >= 70 ? 1900 + anio : 2000 + anio;
}

function construirFechaValida(
  dia: number,
  mes: number,
  anio: number,
): Date | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return null;
  }
  const year = expandirAnioDosDigitos(anio);
  const fecha = new Date(year, mes - 1, dia);
  if (
    fecha.getFullYear() !== year ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }
  return fecha;
}

function parseFechaTexto(
  texto: string,
  formatoFecha?: string | null,
): Date | null {
  const partes = texto.split(/[/\-.]/).map((p) => p.trim());
  if (partes.length !== 3) {
    return null;
  }

  const nums = partes.map((p) => Number.parseInt(p, 10));
  if (nums.some((n) => Number.isNaN(n))) {
    return null;
  }

  const [a, b, c] = nums;

  const intentarOrden = (dia: number, mes: number, anio: number): Date | null =>
    construirFechaValida(dia, mes, anio);

  if (formatoFecha === 'DD/MM/YYYY') {
    const ddmm = intentarOrden(a, b, c);
    if (ddmm) {
      return ddmm;
    }
    // Fallback: archivos Excel US (CREDICOMPRAS) suelen venir MM/DD/YY.
    return intentarOrden(b, a, c);
  }

  if (formatoFecha === 'MM/DD/YYYY') {
    const mmdd = intentarOrden(b, a, c);
    if (mmdd) {
      return mmdd;
    }
    return intentarOrden(a, b, c);
  }

  // Auto-detectar: si un segmento supera 12, delimita día vs mes.
  if (a > 12 && b <= 12) {
    return intentarOrden(a, b, c);
  }
  if (b > 12 && a <= 12) {
    return intentarOrden(b, a, c);
  }

  const mmdd = intentarOrden(b, a, c);
  if (mmdd) {
    return mmdd;
  }
  return intentarOrden(a, b, c);
}

export function parseFecha(
  valor: unknown,
  formatoFecha?: string | null,
): Date | null {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor;
  }
  if (typeof valor === 'number') {
    // Serial Excel (días desde 1899-12-30)
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + valor);
    return epoch;
  }
  const texto = parseTexto(valor);
  if (!texto) {
    return null;
  }

  const desdePartes = parseFechaTexto(texto, formatoFecha);
  if (desdePartes) {
    return desdePartes;
  }

  const parsed = new Date(texto);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseMoneda(valor: unknown): 'NIO' | 'USD' | null {
  const texto = parseTexto(valor)?.toUpperCase().trim();
  if (!texto) {
    return null;
  }
  if (
    texto === 'USD' ||
    texto === 'DOLAR' ||
    texto === 'DÓLAR' ||
    texto === '$'
  ) {
    return 'USD';
  }
  if (
    texto === 'NIO' ||
    texto === 'CORDOBA' ||
    texto === 'CÓRDOBA' ||
    texto === 'C$'
  ) {
    return 'NIO';
  }
  // Tokens cortos / con símbolo (p. ej. "USD 1.00" no aplica aquí; solo moneda).
  if (/^(USD|DOLAR|DÓLAR)$/u.test(texto.replace(/\s+/g, ''))) {
    return 'USD';
  }
  if (/^(NIO|CORDOBA|CÓRDOBA|C\$)$/u.test(texto.replace(/\s+/g, ''))) {
    return 'NIO';
  }
  return null;
}

export function parseTelefonos(valor: unknown): string[] {
  const texto = parseTexto(valor);
  if (!texto) {
    return [];
  }
  return texto
    .split(/[;,|]/)
    .map((t) => t.replace(/\D/g, ''))
    .filter((t) => t.length >= 8);
}
