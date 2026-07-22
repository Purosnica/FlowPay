/**
 * Motor de horarios legales de cobranza (Nicaragua).
 * Valida si una gestión puede registrarse según día, hora y feriados.
 */

import { prisma } from '@/lib/prisma';

import type { ValidacionHorario } from '@/types/cobranza';

export type { ValidacionHorario };

function parseHora(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function obtenerMinutosActuales(fecha: Date): number {
  return fecha.getHours() * 60 + fecha.getMinutes();
}

async function obtenerFeriadoDelDia(
  fecha: Date,
  idpais?: number | null,
) {
  const inicio = new Date(
    Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
  );
  const fin = new Date(
    Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1),
  );
  const rango = { gte: inicio, lt: fin };

  if (idpais != null) {
    const delPais = await prisma.tbl_dia_feriado.findFirst({
      where: { fecha: rango, idpais },
    });
    if (delPais) {
      return delPais;
    }
  }

  return prisma.tbl_dia_feriado.findFirst({
    where: { fecha: rango, idpais: null },
  });
}

/**
 * Valida si la fecha/hora permite registrar una gestión de cobranza.
 */
export async function validarHorarioCobranza(
  fecha: Date,
  idmandante?: number | null,
  idpais?: number | null,
): Promise<ValidacionHorario> {
  const feriado = await obtenerFeriadoDelDia(fecha, idpais);

  if (feriado) {
    return {
      permitido: false,
      motivo: `Día feriado: ${feriado.descripcion}. Gestión de cobranza no permitida.`,
    };
  }

  const diaSemana = fecha.getDay() === 0 ? 7 : fecha.getDay();

  const horarioMandante = idmandante
    ? await prisma.tbl_horario_cobranza.findFirst({
        where: { idmandante, diaSemana },
      })
    : null;

  const horario =
    horarioMandante ??
    (await prisma.tbl_horario_cobranza.findFirst({
      where: { idmandante: null, diaSemana },
    }));

  if (!horario || !horario.permitido) {
    return {
      permitido: false,
      motivo: 'Día no habilitado para gestiones de cobranza (domingo o día bloqueado).',
    };
  }

  const minutosActual = obtenerMinutosActuales(fecha);
  const inicio = parseHora(horario.horaInicio);
  const fin = parseHora(horario.horaFin);

  if (minutosActual < inicio || minutosActual > fin) {
    return {
      permitido: false,
      motivo: `Fuera del horario legal de cobranza (${horario.horaInicio} - ${horario.horaFin}).`,
    };
  }

  return { permitido: true };
}
