/**
 * Detecta si un código de resultado exige datos de promesa de pago.
 */

import type { CodigoResultado } from '@/types/cobranza';

type ResultadoTipificacion = Pick<
  CodigoResultado,
  'codigo' | 'descripcion' | 'grupo' | 'tipoGestion'
>;

function textoCatalogo(resultado: ResultadoTipificacion): string {
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
 * True si el resultado implica registrar una promesa nueva
 * (monto + fecha obligatorios).
 *
 * No exige promesa en tipificaciones negativas: sin promesa,
 * no cumplida, incumplida, etc.
 */
export function resultadoRequierePromesa(
  resultado: ResultadoTipificacion,
): boolean {
  const codigo = resultado.codigo.trim().toUpperCase();
  if (codigo === 'PRP' || codigo === 'CCD') {
    return true;
  }

  const t = textoCatalogo(resultado);
  if (!t.includes('PROMESA')) {
    return false;
  }

  const esNegativa =
    t.includes('SIN PROMESA') ||
    t.includes('NO CUMPLIDA') ||
    t.includes('INCUMPL') ||
    t.includes('ROTA') ||
    t.includes('VENCIDA');

  return !esNegativa;
}

/**
 * True si el resultado implica agenda / próxima gestión.
 */
export function resultadoRequiereProximaGestion(
  resultado: ResultadoTipificacion,
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
