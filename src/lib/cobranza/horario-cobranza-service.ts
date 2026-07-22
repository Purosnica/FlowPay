/**
 * Motor de horarios legales de cobranza (Nicaragua).
 * Valida si una gestión puede registrarse según día, hora y feriados.
 * Día/hora se evalúan en America/Managua (Vercel corre en UTC).
 */

import { prisma } from '@/lib/prisma';
import {
  diaSemanaIsoEnZona,
  minutosDelDiaEnZona,
  partesEnZona,
  TZ_NEGOCIO,
} from '@/lib/utils/timezone';

import type { ValidacionHorario } from '@/types/cobranza';

export type { ValidacionHorario };

function parseHora(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

async function obtenerFeriadoDelDia(
  fecha: Date,
  idpais?: number | null,
) {
  // Feriados se guardan como medianoche UTC del día calendario.
  // Usamos el día calendario en Managua, no el del runtime (UTC en Vercel).
  const p = partesEnZona(fecha, TZ_NEGOCIO);
  const inicio = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const fin = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
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

  const diaSemana = diaSemanaIsoEnZona(fecha, TZ_NEGOCIO);

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
      motivo:
        'Día no habilitado para gestiones de cobranza (domingo o día bloqueado).',
    };
  }

  const minutosActual = minutosDelDiaEnZona(fecha, TZ_NEGOCIO);
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
