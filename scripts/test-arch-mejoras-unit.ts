/**
 * Tests unitarios ARCH I001–I014 (sin infra de pago).
 */

import assert from 'node:assert/strict';
import {
  CircuitBreaker,
  getCircuitBreaker,
  resetCircuitBreakerRegistryForTests,
} from '@/lib/resilience/circuit-breaker';
import {
  debeVersionarMapeo,
  hashMapeoPlantilla,
  metaNuevaPlantilla,
  metaNuevaVersion,
} from '@/lib/cobranza/plantilla-importacion-version';
import {
  IMPORT_PENDING_BACKPRESSURE_PER_MANDANTE,
  puedeAceptarMasImports,
} from '@/lib/queue/job-queue';
import {
  getTenantIsolationPolicy,
  TENANT_ISOLATION_POLICY,
} from '@/lib/tenancy/tenant-isolation';
import { FEATURE_FLAG } from '@/lib/feature-flags/feature-flag-service';

function testCircuitBreaker(): void {
  resetCircuitBreakerRegistryForTests();
  const cb = new CircuitBreaker('test-smtp', {
    failureThreshold: 3,
    cooldownMs: 50,
    successThreshold: 1,
  });
  assert.equal(cb.allowRequest(), true);
  cb.recordFailure();
  cb.recordFailure();
  assert.equal(cb.snapshot().state, 'closed');
  cb.recordFailure();
  assert.equal(cb.snapshot().state, 'open');
  assert.equal(cb.allowRequest(), false);

  const shared = getCircuitBreaker('smtp-shared', { failureThreshold: 1 });
  shared.recordFailure();
  assert.equal(getCircuitBreaker('smtp-shared').allowRequest(), false);
}

function testPlantillaVersion(): void {
  const a = '{"a":"1"}';
  const b = '{"a":"2"}';
  assert.equal(hashMapeoPlantilla(a).length, 64);
  assert.equal(debeVersionarMapeo(a, b), true);
  assert.equal(debeVersionarMapeo(a, a), false);
  assert.equal(debeVersionarMapeo(a, undefined), false);

  const meta = metaNuevaPlantilla(a);
  assert.equal(meta.version, 1);
  assert.ok(meta.contratoId.length > 10);

  const v2 = metaNuevaVersion({
    contratoId: meta.contratoId,
    versionAnterior: meta.version,
    mapeoNuevo: b,
  });
  assert.equal(v2.version, 2);
  assert.equal(v2.contratoId, meta.contratoId);
  assert.notEqual(v2.mapeoHash, meta.mapeoHash);
}

function testQueueBackpressure(): void {
  assert.equal(puedeAceptarMasImports(0), true);
  assert.equal(
    puedeAceptarMasImports(IMPORT_PENDING_BACKPRESSURE_PER_MANDANTE),
    false,
  );
  assert.equal(
    puedeAceptarMasImports(IMPORT_PENDING_BACKPRESSURE_PER_MANDANTE - 1),
    true,
  );
}

function testTenancyYFlags(): void {
  assert.equal(getTenantIsolationPolicy(), TENANT_ISOLATION_POLICY);
  assert.equal(FEATURE_FLAG.EVENT_BUS_WEBHOOKS, 'event_bus_webhooks');
  assert.equal(FEATURE_FLAG.PWA_OFFLINE_GESTIONES, 'pwa_offline_gestiones');
}

function main(): void {
  testCircuitBreaker();
  testPlantillaVersion();
  testQueueBackpressure();
  testTenancyYFlags();
  console.warn('arch-mejoras unit helpers: OK');
}

main();
