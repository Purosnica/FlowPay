/**
 * Pasos del tour guiado del Centro de Inteligencia (I179).
 */

export interface PasoTourCi {
  id: string;
  titulo: string;
  descripcion: string;
  /** data-tour-id del ancla en la página */
  ancla: string;
}

export const PASOS_TOUR_CENTRO_INTELIGENCIA: PasoTourCi[] = [
  {
    id: 'ci-kpis',
    titulo: 'Indicadores operativos',
    descripcion:
      'Mora, contacto y promesas resumidos. Use los enlaces para ir directo a la acción.',
    ancla: 'ci-metrics',
  },
  {
    id: 'ci-insights',
    titulo: 'Insights accionables',
    descripcion:
      'Alertas priorizadas por severidad. Cada insight sugiere qué cartera o bandeja revisar.',
    ancla: 'ci-insights',
  },
  {
    id: 'ci-forecast',
    titulo: 'Pronóstico de recuperación',
    descripcion:
      'Estimación de recuperación esperada según histórico y cartera activa.',
    ancla: 'ci-forecast',
  },
  {
    id: 'ci-tendencia',
    titulo: 'Tendencia',
    descripcion:
      'Evolución reciente de recuperación para detectar mejoras o deterioros.',
    ancla: 'ci-tendencia',
  },
  {
    id: 'ci-alertas',
    titulo: 'Alertas operativas',
    descripcion:
      'Cola de excepciones (acuerdos vencidos, SLA, etc.) que requieren supervisión.',
    ancla: 'ci-alertas',
  },
];

export const STORAGE_TOUR_CI = 'flowpay_ux_tour_ci';
