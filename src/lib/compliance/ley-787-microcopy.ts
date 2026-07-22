/**
 * Microcopy de cumplimiento Ley 787 (I182).
 * Fuente única para textos visibles al cobrador.
 */

export const LEY_787 = {
  tituloCorto: 'Ley 787',
  contactoAutorizado:
    'Solo contacte al deudor por medios autorizados (Ley 787).',
  contactoTerceroLabel: 'Contacto a tercero (Ley 787)',
  contactoTerceroHint:
    'Contactar a un tercero requiere justificación. No revele el monto ni detalles de la deuda.',
  contactoTerceroJustificacionLabel:
    'Justificación (requerida para tercero — Ley 787)',
  horarioPermitido:
    'Horario de cobranza permitido. Respete días y franjas legales (Ley 787).',
  horarioBloqueadoPrefijo: 'Gestión bloqueada (Ley 787):',
  horarioBloqueadoFallback: 'Fuera del horario legal de cobranza.',
  noContactar:
    'Contacto marcado como "no contactar" (Ley 787). No se puede gestionar por este medio.',
  noAutorizado:
    'Contacto no autorizado por el deudor (Ley 787). Márquelo como autorizado antes de gestionar.',
  enviarCobroHint:
    'El envío debe respetar horarios permitidos (Ley 787). La validación se aplica al registrar la gestión.',
  panelContactos:
    'Contactos del deudor (Ley 787). Solo marque autorizado si el deudor lo permitió expresamente.',
  scriptVerbalTitulo: 'Script sugerido — confirmación verbal',
  scriptVerbalHint:
    'Léalo al inicio de la llamada. Confirme identidad y autorización antes de hablar de la deuda (Ley 787).',
} as const;

/**
 * Script base de confirmación verbal en llamada telefónica.
 * Variables: {nombre}, {agencia}.
 */
export function scriptConfirmacionVerbal(vars?: {
  nombre?: string;
  agencia?: string;
}): string {
  const nombre = vars?.nombre?.trim() || 'señor(a)';
  const agencia = vars?.agencia?.trim() || 'nuestra agencia de cobranza';
  return (
    `Buenos días/tardes, ¿hablo con ${nombre}? ` +
    `Le llamo de ${agencia}. ` +
    'Antes de continuar, confirmo que usted es la persona autorizada ' +
    'para recibir esta comunicación sobre su obligación crediticia. ' +
    '¿Me permite continuar? ' +
    '(Ley 787: no discuta montos con terceros no autorizados.)'
  );
}
