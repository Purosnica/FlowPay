import type { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from './decimal-utils';

export interface ContextoPrioridad {
  tienePromesaVencida: boolean;
  tieneAcuerdoVigente: boolean;
  diasSinGestion: number;
  agendaHoy: boolean;
  diasSinGestionAlerta: number;
}

export interface PrestamoPriorizable {
  idprestamo: number;
  diasMora: number;
  saldoTotal: number | Decimal;
}

export interface PrestamoConPrioridad {
  idprestamo: number;
  scorePrioridad: number;
  motivoPrioridad: string;
}

export function calcularScorePrioridad(
  prestamo: PrestamoPriorizable,
  ctx: ContextoPrioridad,
): { score: number; motivo: string } {
  const saldo = decimalToNumber(prestamo.saldoTotal);
  const motivos: string[] = [];
  let score = 0;

  score += Math.min(prestamo.diasMora * 3, 180);
  if (prestamo.diasMora > 0) {
    motivos.push(`${prestamo.diasMora}d mora`);
  }

  score += Math.min(Math.round(saldo / 500), 80);
  if (saldo >= 1000) {
    motivos.push('alto saldo');
  }

  if (ctx.tienePromesaVencida) {
    score += 150;
    motivos.push('promesa vencida');
  }

  if (ctx.agendaHoy) {
    score += 120;
    motivos.push('agenda hoy');
  }

  if (ctx.tieneAcuerdoVigente) {
    score += 50;
    motivos.push('acuerdo vigente');
  }

  if (ctx.diasSinGestion >= ctx.diasSinGestionAlerta) {
    score += 40 + Math.min(ctx.diasSinGestion, 30);
    motivos.push(`${ctx.diasSinGestion}d sin gestión`);
  }

  const motivo =
    motivos.length > 0 ? motivos.slice(0, 3).join(' · ') : 'prioridad estándar';

  return { score, motivo };
}

export function ordenarPorPrioridad<T extends PrestamoPriorizable>(
  prestamos: T[],
  contextos: Map<number, ContextoPrioridad>,
  diasSinGestionAlerta: number,
): Array<T & { scorePrioridad: number; motivoPrioridad: string }> {
  const conScore = prestamos.map((p) => {
    const ctx = contextos.get(p.idprestamo) ?? {
      tienePromesaVencida: false,
      tieneAcuerdoVigente: false,
      diasSinGestion: 0,
      agendaHoy: false,
      diasSinGestionAlerta,
    };
    const { score, motivo } = calcularScorePrioridad(p, ctx);
    return {
      ...p,
      scorePrioridad: score,
      motivoPrioridad: motivo,
    };
  });

  conScore.sort((a, b) => {
    if (b.scorePrioridad !== a.scorePrioridad) {
      return b.scorePrioridad - a.scorePrioridad;
    }
    if (b.diasMora !== a.diasMora) {
      return b.diasMora - a.diasMora;
    }
    return decimalToNumber(b.saldoTotal) - decimalToNumber(a.saldoTotal);
  });

  return conScore;
}
