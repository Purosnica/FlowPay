import assert from 'node:assert/strict';
import {
  debeRefrescarActividad,
  remainingIdleSeconds,
  remainingSessionSeconds,
  resolverLastActivityAt,
  SESSION_ACTIVITY_REFRESH_SECONDS,
  SESSION_IDLE_SECONDS,
} from '@/lib/auth/session-ttl';
import { buildLiveness } from '@/lib/health/health-service';

function testSessionIdleHelpers(): void {
  const ahora = Math.floor(Date.now() / 1000);
  assert.ok(SESSION_IDLE_SECONDS > 0);
  assert.equal(remainingIdleSeconds(ahora), SESSION_IDLE_SECONDS);
  assert.equal(remainingIdleSeconds(ahora - SESSION_IDLE_SECONDS - 1), 0);
  assert.ok(remainingSessionSeconds(ahora) > 0);
  assert.equal(
    resolverLastActivityAt({ lastActivityAt: 100, sessionStartedAt: 50 }),
    100,
  );
  assert.equal(
    resolverLastActivityAt({ sessionStartedAt: 50 }),
    50,
  );
  assert.equal(
    debeRefrescarActividad(ahora - SESSION_ACTIVITY_REFRESH_SECONDS),
    true,
  );
  assert.equal(debeRefrescarActividad(ahora), false);
}

function testLiveness(): void {
  const h = buildLiveness();
  assert.equal(h.status, 'ok');
  assert.equal(h.service, 'flowpay');
  assert.ok(h.ts.length > 0);
}

testSessionIdleHelpers();
testLiveness();
console.warn('session/health: OK');
