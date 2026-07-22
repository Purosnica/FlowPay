import { procesarAcuerdosVencidos } from '@/lib/cobranza/acuerdo-cuota-service';
import { procesarRecalculoMoraCartera } from '@/lib/cobranza/dias-mora-service';
import { procesarPromesasVencidas } from '@/lib/cobranza/promesa-evaluacion-service';
import { procesarCastigoCartera } from '@/lib/cobranza/castigo-cartera-service';
import { escalarReclamosFueraSla } from '@/lib/cobranza/reclamo-sla-service';
import { purgarDatosHistoricos } from '@/lib/cobranza/auditoria-retention-service';
import { procesarImportacionesPendientes } from '@/lib/cobranza/import/importacion-job-service';
import { procesarDigestEmailSupervisores } from '@/lib/cobranza/digest-email-supervisor-service';
import { materializarResumenesDiariosTodos } from '@/lib/cobranza/resumen-diario-service';
import { procesarExportacionesPendientes } from '@/lib/cobranza/exportacion-job-service';
import { procesarOutboxEmailNotificaciones } from '@/lib/cobranza/notificacion-outbox-service';
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
        detalle: {
          evaluados: r.evaluados,
          actualizados: r.actualizados,
          profiling: r.profiling,
        },
      };
    },
  },
  {
    codigo: 'resumen_diario_materializar',
    nombre: 'Materializar resumen diario',
    descripcion:
      'Persiste KPIs diarios por mandante para centro de inteligencia y reportes.',
    timeoutMs: 300_000,
    maxReintentos: 2,
    orden: 25,
    dependeDe: ['mora_recalculo'],
    ejecutar: async () => {
      const r = await materializarResumenesDiariosTodos();
      return {
        registrosProcesados: r.ok,
        detalle: r,
      };
    },
  },
  {
    codigo: 'exportaciones_async',
    nombre: 'Procesar exportaciones async',
    descripcion: 'Genera archivos de reportes grandes (>10k filas) en background.',
    timeoutMs: 300_000,
    maxReintentos: 1,
    orden: 55,
    ejecutar: async () => {
      const r = await procesarExportacionesPendientes();
      return {
        registrosProcesados: r.procesados,
        detalle: r,
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
    codigo: 'asignacion_auto_cron',
    nombre: 'Asignación automática sin gestor',
    descripcion:
      'Reparte préstamos sin gestor en mandantes con asignacion_auto_cron.',
    timeoutMs: 300_000,
    maxReintentos: 1,
    orden: 65,
    dependeDe: ['importaciones_pendientes'],
    ejecutar: async () => {
      const { procesarAsignacionAutoCron } = await import(
        '@/lib/cobranza/asignacion-auto-post-import-service'
      );
      const r = await procesarAsignacionAutoCron();
      return {
        registrosProcesados: r.asignados,
        detalle: { ...r },
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
  {
    codigo: 'digest_email_supervisores',
    nombre: 'Digest email supervisores',
    descripcion:
      'Envía resumen operativo matutino por SMTP a supervisores y gerentes.',
    timeoutMs: 180_000,
    maxReintentos: 1,
    orden: 80,
    dependeDe: ['promesas_vencidas', 'reclamos_sla'],
    ejecutar: async () => {
      const r = await procesarDigestEmailSupervisores();
      return {
        registrosProcesados: r.enviados,
        detalle: { ...r },
      };
    },
  },
  {
    codigo: 'notificacion_email_outbox',
    nombre: 'Outbox email notificaciones',
    descripcion:
      'Envía correos pendientes vinculados a tbl_notificacion (estado PENDIENTE).',
    timeoutMs: 180_000,
    maxReintentos: 1,
    orden: 85,
    ejecutar: async () => {
      const r = await procesarOutboxEmailNotificaciones();
      return {
        registrosProcesados: r.enviados + r.fallidos,
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
