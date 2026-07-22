/**
 * Detecta si un código de resultado exige datos de promesa de pago.
 */

import type { CodigoResultado } from '@/types/cobranza';

function textoCatalogo(resultado: Pick<
  CodigoResultado,
  'codigo' | 'descripcion' | 'grupo' | 'tipoGestion'
>): string {
  return [
    resultado.codigo,
    resultado.descripcion,
    resultado.grupo,
    resultado.tipoGestion,
  ]
    .join(' ')
    .toUpperCase();
}

/**
 * True si el resultado implica promesa (monto + fecha obligatorios).
 */
export function resultadoRequierePromesa(
  resultado: Pick<
    CodigoResultado,
    'codigo' | 'descripcion' | 'grupo' | 'tipoGestion'
  >,
): boolean {
  const t = textoCatalogo(resultado);
  return t.includes('PROMESA');
}

/**
 * True si el resultado implica agenda / próxima gestión.
 */
export function resultadoRequiereProximaGestion(
  resultado: Pick<
    CodigoResultado,
    'codigo' | 'descripcion' | 'grupo' | 'tipoGestion'
  >,
): boolean {
  const t = textoCatalogo(resultado);
  return (
    t.includes('REAGENDA') ||
    t.includes('REPROGRAM') ||
    t.includes('CALLBACK') ||
    t.includes('PROXIMA') ||
    t.includes('PRÓXIMA')
  );
}
