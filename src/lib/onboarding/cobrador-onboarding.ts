/**
 * Definición del onboarding guiado para nuevos cobradores.
 *
 * Contiene los pasos, la clave de persistencia (por usuario) y el estado
 * inicial. La lógica de lectura/escritura vive en `hooks/use-onboarding`.
 */

export interface PasoOnboarding {
  id: string;
  titulo: string;
  descripcion: string;
  href: string;
  ctaLabel: string;
}

export const PASOS_ONBOARDING_COBRADOR: PasoOnboarding[] = [
  {
    id: 'mi-dia',
    titulo: 'Empieza por Mi día',
    descripcion:
      'Aquí ves tu agenda, casos prioritarios y lo recuperado hoy. Es tu punto de partida cada mañana.',
    href: '/cobranza/mi-dia',
    ctaLabel: 'Abrir Mi día',
  },
  {
    id: 'bandeja',
    titulo: 'Conoce tu bandeja',
    descripcion:
      'Tus casos asignados ordenados por prioridad. Usa los filtros para enfocarte en lo importante.',
    href: '/cobranza/bandeja?preset=inbox_operativo',
    ctaLabel: 'Ver mi bandeja',
  },
  {
    id: 'gestion',
    titulo: 'Registra tu primera gestión',
    descripcion:
      'Abre un caso y registra el resultado del contacto. Toda gestión queda en el historial del préstamo.',
    href: '/cobranza/gestiones',
    ctaLabel: 'Ir a gestiones',
  },
  {
    id: 'promesas',
    titulo: 'Da seguimiento a promesas',
    descripcion:
      'Cuando un deudor promete pagar, registra la fecha. Las promesas vencidas son tu prioridad.',
    href: '/cobranza/bandeja?soloPromesaVencida=1',
    ctaLabel: 'Ver promesas',
  },
  {
    id: 'perfil',
    titulo: 'Revisa tu perfil',
    descripcion:
      'Confirma tus datos y tu progreso. Aquí también cambias tu contraseña.',
    href: '/perfil',
    ctaLabel: 'Abrir perfil',
  },
];

const STORAGE_PREFIX = 'flowpay_onboarding_cobrador';

export function claveOnboarding(idusuario: number): string {
  return `${STORAGE_PREFIX}_${idusuario}`;
}

export interface EstadoOnboarding {
  omitido: boolean;
  pasosCompletados: string[];
}

export const ESTADO_ONBOARDING_INICIAL: EstadoOnboarding = {
  omitido: false,
  pasosCompletados: [],
};
