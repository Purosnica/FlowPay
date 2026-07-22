import {
  formatearMoneda,
  type InformeGerencialIndicadores,
} from '@/types/cobranza';

export interface InformeGerencialNarrativa {
  resumenEjecutivo: string;
  valoracionGeneral: string;
  hallazgosPositivos: string[];
  brechasCriticas: string[];
  conclusion: string;
  compromisosProximoPeriodo: string[];
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

/**
 * Genera textos del informe a partir de indicadores del período.
 * Cumplidos = estado CUMPLIDO; incumplidos = ROTO; VIGENTE no cuenta
 * como cumplido (H24).
 */
export function construirNarrativaInforme(params: {
  periodoLabel: string;
  proximoPeriodoLabel: string;
  indicadores: InformeGerencialIndicadores;
  pctCarteraCritica: number;
  acuerdosSinFechaInicio: number;
}): InformeGerencialNarrativa {
  const {
    periodoLabel,
    proximoPeriodoLabel,
    indicadores,
    pctCarteraCritica,
    acuerdosSinFechaInicio,
  } = params;

  const monto = formatearMoneda(indicadores.montoRecuperado);
  const formalizados = indicadores.acuerdosFormalizados;
  const incumplidos = indicadores.acuerdosIncumplidos;
  const cumplidos = indicadores.acuerdosCumplidos;
  const vigentes = Math.max(0, formalizados - cumplidos - incumplidos);
  const eficacia = indicadores.eficaciaAcuerdosPct;

  const resumenEjecutivo =
    `Durante el período comprendido del ${periodoLabel}, se ejecutó una ` +
    `gestión activa y estratégica orientada a la recuperación de cartera ` +
    `en mora. Las acciones se centraron en la negociación efectiva, el ` +
    `seguimiento intensivo de compromisos y la verificación en campo de ` +
    `clientes de difícil localización.`;

  let valoracionGeneral: string;
  if (incumplidos === 0 && cumplidos > 0) {
    valoracionGeneral =
      `La gestión refleja un enfoque operativo efectivo, logrando avances ` +
      `en la recuperación de saldos (${monto}) y la activación de acuerdos ` +
      `de pago (${formalizados}). Se registran ${cumplidos} acuerdo(s) ` +
      `cumplidos` +
      (vigentes > 0 ? ` y ${vigentes} aún vigente(s)` : '') +
      ` (eficacia de cierre ${pct(eficacia)}).`;
  } else if (incumplidos === 0) {
    valoracionGeneral =
      `La gestión refleja un enfoque operativo efectivo, logrando avances ` +
      `en la recuperación de saldos (${monto}) y la activación de acuerdos ` +
      `de pago (${formalizados}). Aún no hay acuerdos cerrados como ` +
      `cumplidos; los vigentes no se contabilizan como cumplidos hasta ` +
      `su cierre formal.`;
  } else if (eficacia >= 70) {
    valoracionGeneral =
      `La gestión refleja un enfoque operativo efectivo, con ` +
      `${cumplidos} acuerdo(s) cumplidos y ${incumplidos} roto(s). ` +
      `Se recomienda reforzar el seguimiento de los casos rotos para ` +
      `recuperar el nivel de cumplimiento.`;
  } else {
    valoracionGeneral =
      `La gestión logró avances en recuperación (${monto}) y formalización ` +
      `de acuerdos (${formalizados}). Se identifican ${incumplidos} ` +
      `acuerdo(s) rotos, lo que requiere fortalecer el seguimiento y la ` +
      `selección de clientes con capacidad real de pago.`;
  }

  const hallazgosPositivos: string[] = [
    `Formalización de ${formalizados} nuevos acuerdos de pago, lo que ` +
      `evidencia capacidad de negociación y disposición al diálogo por ` +
      `parte de los clientes.`,
    `Recuperación efectiva de ${monto}, que representa un avance en la ` +
      `recuperación de cartera del período.`,
    `Implementación de múltiples canales de contacto, lo que ha permitido ` +
      `ampliar la cobertura de gestión ` +
      `(${indicadores.totalGestiones} gestiones registradas).`,
  ];

  const brechasCriticas: string[] = [];

  if (incumplidos > 0) {
    brechasCriticas.push(
      `Acuerdos rotos: ${incumplidos} de ${formalizados} acuerdos ` +
        `formalizados (` +
        `${cumplidos} cumplido${cumplidos === 1 ? '' : 's'}, ` +
        `eficacia ${pct(eficacia)}).`,
    );
  }

  if (acuerdosSinFechaInicio > 0) {
    brechasCriticas.push(
      `Falta de fechas de primer pago definidas: ${acuerdosSinFechaInicio} ` +
        `acuerdo(s) carecen de una fecha concreta de inicio, lo que ` +
        `dificulta el seguimiento y la exigibilidad.`,
    );
  }

  if (pctCarteraCritica >= 40) {
    brechasCriticas.push(
      `Cartera crítica sin respuesta: el ${Math.round(pctCarteraCritica)}% ` +
        `de los clientes en cartera se encuentran en segmento crítico ` +
        `(sin respuesta o reincidentes), lo que limita las oportunidades ` +
        `de negociación.`,
    );
  }

  if (brechasCriticas.length === 0) {
    brechasCriticas.push(
      'No se identificaron brechas críticas materiales en el período; ' +
        'no hay acuerdos rotos y los cumplidos se limitan a estado CUMPLIDO.',
    );
  }

  const conclusion =
    `La gestión realizada durante el período comprendido del ` +
    `${periodoLabel} ha permitido avances concretos en la recuperación ` +
    `de cartera, reflejados en:\n` +
    `• ${formalizados} acuerdos de pago formalizados\n` +
    `• ${monto} recuperados efectivamente\n` +
    `• ${cumplidos} acuerdo(s) cumplidos · ${incumplidos} roto(s)` +
    (vigentes > 0 ? ` · ${vigentes} vigente(s)` : '') +
    `\n\n` +
    (incumplidos > formalizados * 0.3
      ? `Se reconoce la necesidad de intensificar el seguimiento sobre ` +
        `acuerdos rotos y ajustar estrategias de cobranza.\n\n`
      : `Los resultados del período sustentan la continuidad de la ` +
        `estrategia vigente. Solo los acuerdos en estado CUMPLIDO ` +
        `cuentan como cumplidos; los VIGENTE siguen en seguimiento.\n\n`) +
    `Frente a este panorama, como empresa especializada en recuperación ` +
    `de cartera, continuaremos ejecutando una gestión firme, estructurada ` +
    `y escalonada. Continuaremos informando de manera periódica la ` +
    `evolución de la gestión y los ajustes estratégicos para el ` +
    `próximo período (${proximoPeriodoLabel}).`;

  const metaPagos = Math.max(10, Math.ceil(formalizados * 0.67));
  const compromisosProximoPeriodo = [
    incumplidos > 0
      ? `Reducir la tasa de acuerdos rotos en un 30%.`
      : `Mantener en 0 los acuerdos rotos.`,
    `Lograr al menos ${metaPagos} pagos efectivos de los acuerdos ` +
      `formalizados.`,
    `Establecer fecha de primer pago en el 100% de los nuevos acuerdos.`,
    `Depurar el 100% de las direcciones inlocalizables.`,
  ];

  return {
    resumenEjecutivo,
    valoracionGeneral,
    hallazgosPositivos,
    brechasCriticas,
    conclusion,
    compromisosProximoPeriodo,
  };
}
