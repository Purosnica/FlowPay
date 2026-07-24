/**
 * Lógica pura para registrar gestión automática al contactar
 * (llamada / WhatsApp / SMS / email).
 */

export type CanalGestionContacto =
  | 'LLAMADA'
  | 'WHATSAPP'
  | 'SMS'
  | 'EMAIL';

const CODIGO_ACCION_POR_CANAL: Record<CanalGestionContacto, string> = {
  LLAMADA: 'LLC',
  WHATSAPP: 'TTC',
  SMS: 'SMS',
  EMAIL: 'CE',
};

const ETIQUETA_CANAL: Record<CanalGestionContacto, string> = {
  LLAMADA: 'Llamada telefónica',
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
  EMAIL: 'Correo electrónico',
};

export function codigoAccionPorCanal(
  canal: CanalGestionContacto,
): string {
  return CODIGO_ACCION_POR_CANAL[canal];
}

export function etiquetaCanalGestion(
  canal: CanalGestionContacto,
): string {
  return ETIQUETA_CANAL[canal];
}

/**
 * Nota mínima requerida por createGestion al registrar el contacto.
 */
export function construirNotaGestionContacto(
  canal: CanalGestionContacto,
  opts?: { mensajeSnippet?: string | null },
): string {
  const base = `Contacto automático — ${etiquetaCanalGestion(canal)}`;
  const snippet = opts?.mensajeSnippet?.trim();
  if (!snippet) {
    return base;
  }
  return `${base}: ${snippet.slice(0, 120)}`;
}

export function resolverIdCodAccionPorCanal(
  codigos: ReadonlyArray<{ idcodaccion: number; codigo: string }>,
  canal: CanalGestionContacto,
): number | undefined {
  const codigo = codigoAccionPorCanal(canal);
  const found = codigos.find((c) => c.codigo === codigo);
  return found?.idcodaccion;
}

/**
 * Mapea canal de secuencia/plantilla a canal de gestión automática.
 */
export function canalGestionDesdeTexto(
  canal: string | null | undefined,
): CanalGestionContacto | null {
  const normalized = (canal ?? '').trim().toUpperCase();
  if (
    normalized === 'LLAMADA' ||
    normalized === 'TELEFONO' ||
    normalized === 'TEL'
  ) {
    return 'LLAMADA';
  }
  if (normalized === 'WHATSAPP' || normalized === 'WAP') {
    return 'WHATSAPP';
  }
  if (normalized === 'SMS') {
    return 'SMS';
  }
  if (normalized === 'EMAIL' || normalized === 'CORREO') {
    return 'EMAIL';
  }
  return null;
}
