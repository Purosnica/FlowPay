/**
 * Analytics de producto privacy-safe (I175 / I189).
 * Sin PII: no emails, teléfonos, nombres ni IDs de deudor/préstamo.
 * Solo métricas agregadas en localStorage + callback opcional.
 */

export type ProductEventName =
  | 'session_start'
  | 'first_gestion'
  | 'gestion_created'
  | 'ui_click'
  | 'tour_step';

export interface ProductEvent {
  name: ProductEventName;
  ts: number;
  /** Segundos desde session_start (solo first_gestion). */
  timeToFirstGestionSec?: number;
  /** Selector semántico sin PII (ej. data-ux-id). */
  targetId?: string;
  /** Ruta sin querystring. */
  path?: string;
  meta?: Record<string, string | number | boolean>;
}

export interface TimeToFirstGestionMetric {
  sessionId: string;
  timeToFirstGestionSec: number;
  recordedAt: number;
}

const SESSION_KEY = 'flowpay_ux_session';
const TTFG_KEY = 'flowpay_ux_ttfg';
const HEATMAP_KEY = 'flowpay_ux_heatmap';
const MAX_HEATMAP_BUCKETS = 200;

interface SessionState {
  sessionId: string;
  startedAt: number;
  firstGestionAt: number | null;
}

interface HeatmapBucket {
  targetId: string;
  path: string;
  count: number;
}

type AnalyticsSink = (event: ProductEvent) => void;

let sink: AnalyticsSink | null = null;

export function setProductAnalyticsSink(fn: AnalyticsSink | null): void {
  sink = fn;
}

function safePath(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.pathname;
}

function readSession(): SessionState | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as SessionState;
    if (
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.startedAt !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(state: SessionState): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

function emit(event: ProductEvent): void {
  sink?.(event);
}

export function ensureAnalyticsSession(): SessionState {
  const existing = readSession();
  if (existing) {
    return existing;
  }
  const state: SessionState = {
    sessionId: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    startedAt: Date.now(),
    firstGestionAt: null,
  };
  writeSession(state);
  emit({
    name: 'session_start',
    ts: state.startedAt,
    path: safePath(),
  });
  return state;
}

/**
 * Registra la primera gestión de la sesión y el time-to-first-gestion.
 */
export function trackGestionCreated(): TimeToFirstGestionMetric | null {
  const session = ensureAnalyticsSession();
  const now = Date.now();
  emit({
    name: 'gestion_created',
    ts: now,
    path: safePath(),
  });

  if (session.firstGestionAt != null) {
    return null;
  }

  const timeToFirstGestionSec = Math.max(
    0,
    Math.round((now - session.startedAt) / 1000),
  );
  const updated: SessionState = {
    ...session,
    firstGestionAt: now,
  };
  writeSession(updated);

  const metric: TimeToFirstGestionMetric = {
    sessionId: session.sessionId,
    timeToFirstGestionSec,
    recordedAt: now,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(TTFG_KEY, JSON.stringify(metric));
  }

  emit({
    name: 'first_gestion',
    ts: now,
    timeToFirstGestionSec,
    path: safePath(),
  });

  return metric;
}

export function getLastTimeToFirstGestion(): TimeToFirstGestionMetric | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(TTFG_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as TimeToFirstGestionMetric;
  } catch {
    return null;
  }
}

/**
 * Heatmap privacy-safe: solo agrega por data-ux-id + path (sin coordenadas ni PII).
 */
export function trackUiClick(targetId: string): void {
  const id = targetId.trim();
  if (!id || id.length > 80) {
    return;
  }
  ensureAnalyticsSession();
  const path = safePath();
  const now = Date.now();
  emit({
    name: 'ui_click',
    ts: now,
    targetId: id,
    path,
  });

  if (typeof window === 'undefined') {
    return;
  }

  try {
    const raw = localStorage.getItem(HEATMAP_KEY);
    const buckets: HeatmapBucket[] = raw
      ? (JSON.parse(raw) as HeatmapBucket[])
      : [];
    const idx = buckets.findIndex(
      (b) => b.targetId === id && b.path === path,
    );
    if (idx >= 0) {
      buckets[idx] = {
        ...buckets[idx],
        count: buckets[idx].count + 1,
      };
    } else if (buckets.length < MAX_HEATMAP_BUCKETS) {
      buckets.push({ targetId: id, path, count: 1 });
    }
    localStorage.setItem(HEATMAP_KEY, JSON.stringify(buckets));
  } catch {
    // ignore quota / parse errors
  }
}

export function getHeatmapBuckets(): HeatmapBucket[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(HEATMAP_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as HeatmapBucket[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function trackTourStep(stepId: string): void {
  emit({
    name: 'tour_step',
    ts: Date.now(),
    targetId: stepId,
    path: safePath(),
  });
}
