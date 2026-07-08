import { procesarAcuerdosVencidos } from '@/lib/cobranza/acuerdo-cuota-service';
import { procesarRecalculoMoraCartera } from '@/lib/cobranza/dias-mora-service';
import { procesarPromesasVencidas } from '@/lib/cobranza/promesa-evaluacion-service';
import { procesarCastigoCartera } from '@/lib/cobranza/castigo-cartera-service';
import { escalarReclamosFueraSla } from '@/lib/cobranza/reclamo-sla-service';
import { purgarDatosHistoricos } from '@/lib/cobranza/auditoria-retention-service';
import { procesarImportacionesPendientes } from '@/lib/cobranza/import/importacion-job-service';
import { obtenerImportMaxJobsPerRun } from '@/lib/scalability/scalability-config';
import type { CronJobDefinition } from './cron-types';

export const CRON_MASTER_CODIGO = 'operaciones_cobranza';
export const CRON_MASTER_SCHEDULE = '0 6 * * *';

export const CRON_SUB_JOBS: CronJobDefinition[] = [
  {
    codigo: 'acuerdos_vencidos',
    nombre: 'Acuerdos vencidos',
    descripcion: 'Evalúa cuotas de acuerdos y marca acuerdos rotos.',
    timeoutMs: 120_000,
    maxReintentos: 2,
    orden: 10,
    ejecutar: async () => {
      const r = await procesarAcuerdosVencidos();
      return {
        registrosProcesados: r.evaluados,
        detalle: { evaluados: r.evaluados, rotos: r.rotos },
      };
    },
  },
  {
    codigo: 'mora_recalculo',
    nombre: 'Recálculo de mora',
    descripcion: 'Recalcula días de mora de préstamos activos.',
    timeoutMs: 600_000,
    maxReintentos: 1,
    orden: 20,
    dependeDe: ['acuerdos_vencidos'],
    ejecutar: async () => {
      const r = await procesarRecalculoMoraCartera();
      return {
        registrosProcesados: r.evaluados,
        detalle: { evaluados: r.evaluados, actualizados: r.actualizados },
      };
    },
  },
  {
    codigo: 'castigo_cartera',
    nombre: 'Castigo de cartera',
    descripcion: 'Evalúa préstamos candidatos a castigo por mora.',
    timeoutMs: 180_000,
    maxReintentos: 2,
    orden: 30,
    dependeDe: ['mora_recalculo'],
    ejecutar: async () => {
      const r = await procesarCastigoCartera();
      return {
        registrosProcesados: r.evaluados,
        detalle: { evaluados: r.evaluados, castigados: r.castigados },
      };
    },
  },
  {
    codigo: 'promesas_vencidas',
    nombre: 'Promesas vencidas',
    descripcion: 'Marca promesas de pago incumplidas.',
    timeoutMs: 120_000,
    maxReintentos: 2,
    orden: 40,
    ejecutar: async () => {
      const r = await procesarPromesasVencidas();
      return {
        registrosProcesados: r.evaluadas,
        detalle: {
          evaluadas: r.evaluadas,
          cumplidas: r.cumplidas,
          vencidas: r.vencidas,
        },
      };
    },
  },
  {
    codigo: 'reclamos_sla',
    nombre: 'Reclamos fuera de SLA',
    descripcion: 'Escala reclamos que exceden el plazo de atención.',
    timeoutMs: 60_000,
    maxReintentos: 2,
    orden: 50,
    ejecutar: async () => {
      const r = await escalarReclamosFueraSla();
      return {
        registrosProcesados: r.reclamosEscalados,
        detalle: {
          reclamosEscalados: r.reclamosEscalados,
          ids: r.ids,
        },
      };
    },
  },
  {
    codigo: 'importaciones_pendientes',
    nombre: 'Importaciones pendientes',
    descripcion: 'Procesa jobs de importación de cartera en cola.',
    timeoutMs: 600_000,
    maxReintentos: 1,
    orden: 60,
    ejecutar: async () => {
      const r = await procesarImportacionesPendientes(
        obtenerImportMaxJobsPerRun(),
      );
      return {
        registrosProcesados: r.procesados,
        detalle: { procesados: r.procesados, errores: r.errores },
      };
    },
  },
  {
    codigo: 'auditoria_retencion',
    nombre: 'Retención auditoría y cron',
    descripcion:
      'Purga registros antiguos de auditoría, ejecuciones cron y rate limits.',
    timeoutMs: 120_000,
    maxReintentos: 1,
    orden: 70,
    ejecutar: async () => {
      const r = await purgarDatosHistoricos();
      return {
        registrosProcesados:
          r.auditoriaEliminados +
          r.cronEjecucionesEliminadas +
          r.rateLimitEliminados,
        detalle: { ...r },
      };
    },
  },
];

export function obtenerDefinicionSubJob(
  codigo: string,
): CronJobDefinition | undefined {
  return CRON_SUB_JOBS.find((j) => j.codigo === codigo);
}
