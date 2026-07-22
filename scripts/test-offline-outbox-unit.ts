/**
 * Unit smoke I036 outbox (sin DOM localStorage real en Node → API pura).
 */
import assert from 'node:assert/strict';
import { crearIdempotencyKey } from '@/lib/api/idempotency-key';

function testKeys(): void {
  const a = crearIdempotencyKey('ges');
  const b = crearIdempotencyKey('ges');
  assert.ok(a.length >= 8 && a.length <= 64);
  assert.notEqual(a, b);
}

testKeys();
console.warn('ux/offline unit helpers: OK');
