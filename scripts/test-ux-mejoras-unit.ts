/**
 * Tests unitarios UX I175–I189 (analytics, microcopy, prefs).
 */
import assert from 'node:assert/strict';
import {
  LEY_787,
  scriptConfirmacionVerbal,
} from '@/lib/compliance/ley-787-microcopy';
import {
  PASOS_TOUR_CENTRO_INTELIGENCIA,
  STORAGE_TOUR_CI,
} from '@/lib/ux/tour-centro-inteligencia';
import {
  UX_PREF_KEYS,
  claveReporteColumnas,
} from '@/lib/ux/ux-prefs';
import {
  ensureAnalyticsSession,
  trackGestionCreated,
  trackUiClick,
  getHeatmapBuckets,
  getLastTimeToFirstGestion,
} from '@/lib/analytics/product-analytics';
import {
  lineaSecundariaTimeline,
  resumirTextoTimeline,
} from '@/lib/logic/prestamo-timeline-ui-logic';
import { prestamosOperativosCliente } from '@/lib/logic/cliente-cobranza-acciones-logic';

function testLey787Microcopy(): void {
  assert.ok(LEY_787.contactoTerceroLabel.includes('Ley 787'));
  assert.ok(LEY_787.horarioPermitido.includes('Ley 787'));
  assert.ok(LEY_787.scriptVerbalTitulo.length > 0);
  assert.ok(LEY_787.contactoAutorizado.includes('Ley 787'));
  assert.ok(LEY_787.noContactar.includes('no contactar'));
  assert.ok(LEY_787.noAutorizado.includes('autorizado'));
  assert.ok(LEY_787.panelContactos.includes('Ley 787'));

  const script = scriptConfirmacionVerbal({
    nombre: 'Ana Pérez',
    agencia: 'FlowPay Cobranza',
  });
  assert.ok(script.includes('Ana Pérez'));
  assert.ok(script.includes('FlowPay Cobranza'));
  assert.ok(script.includes('Ley 787'));

  const scriptDefault = scriptConfirmacionVerbal();
  assert.ok(scriptDefault.includes('señor(a)'));
}

function testTourCi(): void {
  assert.ok(PASOS_TOUR_CENTRO_INTELIGENCIA.length >= 4);
  const anclas = new Set(
    PASOS_TOUR_CENTRO_INTELIGENCIA.map((p) => p.ancla),
  );
  assert.ok(anclas.has('ci-metrics'));
  assert.ok(anclas.has('ci-insights'));
  assert.ok(anclas.has('ci-forecast'));
  assert.equal(typeof STORAGE_TOUR_CI, 'string');
}

function testUxPrefsKeys(): void {
  assert.ok(UX_PREF_KEYS.gamificacionQuiet.startsWith('flowpay_ux_'));
  const clave = claveReporteColumnas(42, 'efectividad-por-gestor');
  assert.ok(clave.includes('42'));
  assert.ok(clave.includes('efectividad-por-gestor'));
}

function testAnalyticsExports(): void {
  assert.equal(typeof ensureAnalyticsSession, 'function');
  assert.equal(typeof trackGestionCreated, 'function');
  assert.equal(typeof trackUiClick, 'function');
  assert.equal(typeof getHeatmapBuckets, 'function');
  assert.equal(typeof getLastTimeToFirstGestion, 'function');

  assert.deepEqual(getHeatmapBuckets(), []);
  assert.equal(getLastTimeToFirstGestion(), null);
  const session = ensureAnalyticsSession();
  assert.ok(session.sessionId.length > 0);
  assert.equal(session.firstGestionAt, null);
}

function testTimelineUiLogic(): void {
  const json = resumirTextoTimeline(
    '{"gestorAnterior":"null","gestorNuevo":4}',
  );
  assert.equal(json, 'gestorNuevo: 4');

  const largo = 'x'.repeat(120);
  const resumido = resumirTextoTimeline(largo, 40);
  assert.ok(resumido !== null && resumido.endsWith('…'));
  assert.ok(resumido.length <= 40);

  const linea = lineaSecundariaTimeline('500 NIO · DEPOSITO', null);
  assert.equal(linea, '500 NIO · DEPOSITO');
}

function testClienteCobranzaAccionesLogic(): void {
  const operativos = prestamosOperativosCliente([
    {
      idprestamo: 1,
      noPrestamo: 'A',
      estado: 'Vencido',
      saldoTotal: 100,
      diasMora: 10,
      mandante: 'M',
    },
    {
      idprestamo: 2,
      noPrestamo: 'B',
      estado: 'Cancelado',
      saldoTotal: 0,
      diasMora: 0,
      mandante: 'M',
    },
    {
      idprestamo: 3,
      noPrestamo: 'C',
      estado: 'Finalizado',
      saldoTotal: 0,
      diasMora: 0,
      mandante: 'M',
    },
  ]);
  assert.equal(operativos.length, 1);
  assert.equal(operativos[0].idprestamo, 1);
}

function main(): void {
  testLey787Microcopy();
  testTourCi();
  testUxPrefsKeys();
  testAnalyticsExports();
  testTimelineUiLogic();
  testClienteCobranzaAccionesLogic();
  // eslint-disable-next-line no-console
  console.warn('test-ux-mejoras-unit: OK');
}

main();
