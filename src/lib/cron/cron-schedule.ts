import { CronExpressionParser } from 'cron-parser';

/**
 * Calcula la próxima ejecución a partir de una expresión cron estándar (5 campos).
 */
export function calcularProximaEjecucion(
  schedule: string,
  desde: Date = new Date(),
): Date | null {
  try {
    const interval = CronExpressionParser.parse(schedule, {
      currentDate: desde,
      tz: 'America/Managua',
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}
