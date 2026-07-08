export const CRON_ESTADOS_EJECUCION = [
  'EN_CURSO',
  'OK',
  'ERROR',
  'OMITIDO',
  'TIMEOUT',
  'PARCIAL',
] as const;

export type CronEstadoEjecucion = (typeof CRON_ESTADOS_EJECUCION)[number];

export type CronTrigger = 'cron' | 'manual';

export interface CronJobResult {
  registrosProcesados: number;
  detalle: Record<string, unknown>;
}

export interface CronJobRunSummary {
  codigo: string;
  estado: CronEstadoEjecucion;
  intentos: number;
  duracionMs: number;
  registrosProcesados: number;
  error?: string;
  detalle?: Record<string, unknown>;
}

export interface CronOrchestratorResult {
  idejecucion: number;
  estado: CronEstadoEjecucion;
  iniciadoEn: string;
  finalizadoEn: string;
  duracionMs: number;
  jobs: CronJobRunSummary[];
  errores: number;
  omitidos: number;
}

export interface CronJobDefinition {
  codigo: string;
  nombre: string;
  descripcion: string;
  schedule?: string;
  timeoutMs: number;
  maxReintentos: number;
  orden: number;
  dependeDe?: string[];
  ejecutar: () => Promise<CronJobResult>;
}
