import { prisma } from '@/lib/prisma';

export const CLAVE_PRESTAMOS_AUSENTES = 'cobranza.prestamos_ausentes_accion';

export type AccionPrestamoAusente =
  | 'MANTENER_ACTIVO'
  | 'PENDIENTE_REVISION'
  | 'FINALIZADO'
  | 'CANCELADO';

const ACCIONES_VALIDAS: AccionPrestamoAusente[] = [
  'MANTENER_ACTIVO',
  'PENDIENTE_REVISION',
  'FINALIZADO',
  'CANCELADO',
];

const ESTADO_POR_ACCION: Record<
  Exclude<AccionPrestamoAusente, 'MANTENER_ACTIVO'>,
  string
> = {
  PENDIENTE_REVISION: 'Pendiente revisión',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

export function esAccionPrestamoAusenteValida(
  valor: string,
): valor is AccionPrestamoAusente {
  return ACCIONES_VALIDAS.includes(valor as AccionPrestamoAusente);
}

export function estadoParaPrestamoAusente(
  accion: AccionPrestamoAusente,
): string | null {
  if (accion === 'MANTENER_ACTIVO') {
    return null;
  }
  return ESTADO_POR_ACCION[accion];
}

export async function obtenerAccionPrestamosAusentes(): Promise<AccionPrestamoAusente> {
  const config = await prisma.tbl_configuracion_sistema.findFirst({
    where: { clave: CLAVE_PRESTAMOS_AUSENTES, deletedAt: null },
  });

  if (config && esAccionPrestamoAusenteValida(config.valor)) {
    return config.valor;
  }

  return 'MANTENER_ACTIVO';
}
