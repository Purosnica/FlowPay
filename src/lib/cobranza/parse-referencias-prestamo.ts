/**
 * Parsea una lista pegada de referencias de préstamo
 * (No. préstamo o código único).
 * Acepta saltos de línea, comas, punto y coma o tabs.
 */
export function parseReferenciasPrestamo(texto: string): string[] {
  const vistos = new Set<string>();
  const resultado: string[] = [];

  for (const parte of texto.split(/[\n\r,;\t]+/)) {
    const ref = parte.trim();
    if (!ref || vistos.has(ref)) {
      continue;
    }
    vistos.add(ref);
    resultado.push(ref);
  }

  return resultado;
}
