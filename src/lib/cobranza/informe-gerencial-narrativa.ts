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
 * Réplica del tono del informe gerencial original (cierre de mes).
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
  const eficacia = indicadores.eficaciaAcuerdosPct;

  const resumenEjecutivo =
    `Durante el período comprendido del ${periodoLabel}, se ejecutó una ` +
    `gestión activa y estratégica orientada a la recuperación de cartera ` +
    `en mora. Las acciones se centraron en la negociación efectiva, el ` +
    `seguimiento intensivo de compromisos y la verificación en campo de ` +
    `clientes de difícil localización.`;

  let valoracionGeneral: string;
  if (eficacia >= 50 && incumplidos <= formalizados * 0.3) {
    valoracionGeneral =
      `La gestión refleja un enfoque operativo efectivo, logrando avances ` +
      `en la recuperación de saldos (${monto}) y la activación de acuerdos ` +
      `de pago (${formalizados}). La tasa de cumplimiento de acuerdos ` +
      `(${pct(eficacia)}) se mantiene en un rango aceptable; se recomienda ` +
      `sostener el ritmo de seguimiento para consolidar los resultados.`;
  } else {
    valoracionGeneral =
      `La gestión refleja un enfoque operativo efectivo, logrando avances ` +
      `en la recuperación de saldos y la activación de acuerdos de pago. ` +
      `Sin embargo, se identifica una brecha crítica en la tasa de ` +
      `cumplimiento de los acuerdos (${pct(eficacia)}), lo que evidencia ` +
      `la necesidad de fortalecer los mecanismos de seguimiento y la ` +
      `rigurosidad en la selección de clientes con capacidad real de pago.`;
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

  const brechasCriticas: string[] = [
    `Tasa de incumplimiento de acuerdos: ${incumplidos} de ` +
      `${formalizados} acuerdos formalizados no se encuentran cumplidos, ` +
      `lo que representa una eficacia del ${pct(eficacia)} ` +
      `(${cumplidos} de ${formalizados} cumplido` +
      `${cumplidos === 1 ? '' : 's'}).`,
  ];

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

  const conclusion =
    `La gestión realizada durante el período comprendido del ` +
    `${periodoLabel} ha permitido avances concretos en la recuperación ` +
    `de cartera, reflejados en:\n` +
    `• ${formalizados} acuerdos de pago formalizados\n` +
    `• ${monto} recuperados efectivamente\n\n` +
    (eficacia < 50
      ? `No obstante, se reconoce que los resultados obtenidos se ` +
        `encuentran por debajo de lo esperado, evidenciando la necesidad ` +
        `de intensificar y ajustar las estrategias de cobranza, ` +
        `especialmente en lo referente a la calidad de los datos de ` +
        `contacto, la definición clara de fechas de inicio en los ` +
        `acuerdos y la tasa de incumplimiento de promesas de pago.\n\n`
      : `Los resultados del período sustentan la continuidad de la ` +
        `estrategia vigente, con ajustes puntuales de seguimiento.\n\n`) +
    `Frente a este panorama, como empresa especializada en recuperación ` +
    `de cartera, continuaremos ejecutando una gestión firme, estructurada ` +
    `y escalonada. Continuaremos informando de manera periódica la ` +
    `evolución de la gestión y los ajustes estratégicos para el ` +
    `próximo período (${proximoPeriodoLabel}).`;

  const metaPagos = Math.max(10, Math.ceil(formalizados * 0.67));
  const compromisosProximoPeriodo = [
    `Reducir la tasa de incumplimiento recurrente en un 30%.`,
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
