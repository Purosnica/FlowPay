/**
 * Tests unitarios PERF I106 / I112 / I116.
 */
import assert from 'node:assert/strict';
import { mapearKpisDesdeResumenMaterializado } from '@/lib/cobranza/metric-kpi-service';
import type { ResumenDiarioCobranza } from '@/lib/cobranza/resumen-diario-service';
import { ActualizarConfigCobranzaSchema } from '@/lib/validators/graphql-args';
import { aplicarRespuestaCatalogoEtag } from '@/lib/http/catalog-etag-client';

function testMapearKpisDesdeResumen(): void {
  const resumen: ResumenDiarioCobranza = {
    idmandante: 1,
    fecha: new Date('2026-07-22'),
    totalPrestamos: 10,
    prestamosEnMora: 3,
    saldoCartera: 1000,
    saldoMora: 250,
    gestionesDia: 5,
    pagosDia: 2,
    montoRecuperadoDia: 50,
    promesasVencidas: 1,
    acuerdosEnRiesgo: 0,
    reclamosFueraSla: 0,
    recuperacionMesActual: 400,
    recuperacionMesAnterior: 300,
  };
  const kpis = mapearKpisDesdeResumenMaterializado(resumen, {
    gestionesMes: 20,
    tasaContactoPct: 50,
    promesasAbiertas: 4,
    acuerdosVigentes: 2,
  });
  assert.equal(kpis.carteraTotal, 1000);
  assert.equal(kpis.carteraEnMora, 250);
  assert.equal(kpis.carteraEnMoraPct, 25);
  assert.equal(kpis.recuperacionMes, 400);
  assert.equal(kpis.gestionesMes, 20);
  assert.equal(kpis.tasaContactoPct, 50);
}

function testLimitesCandidatosZod(): void {
  const ok = ActualizarConfigCobranzaSchema.parse({
    bandejaCandidateLimit: 800,
    miDiaCandidateLimit: 150,
  });
  assert.equal(ok.bandejaCandidateLimit, 800);
  assert.equal(ok.miDiaCandidateLimit, 150);
  assert.throws(() =>
    ActualizarConfigCobranzaSchema.parse({ bandejaCandidateLimit: 0 }),
  );
  assert.throws(() =>
    ActualizarConfigCobranzaSchema.parse({ miDiaCandidateLimit: 6000 }),
  );
}

function testCatalogoEtag304(): void {
  const previous = { etag: '"abc"', data: { n: 1 } };
  const cached = aplicarRespuestaCatalogoEtag({
    status: 304,
    etag: '"abc"',
    body: null,
    previous,
  });
  assert.deepEqual(cached, previous);

  const fresh = aplicarRespuestaCatalogoEtag({
    status: 200,
    etag: '"def"',
    body: { n: 2 },
    previous,
  });
  assert.deepEqual(fresh, { etag: '"def"', data: { n: 2 } });
}

testMapearKpisDesdeResumen();
testLimitesCandidatosZod();
testCatalogoEtag304();
console.warn('test-perf-mejoras-unit: OK');
