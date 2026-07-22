import assert from 'node:assert/strict';
import { withRetry } from '@/lib/utils/with-retry';
import {
  calcularMfaSetupRequired,
  rolRequiereMfa,
} from '@/lib/auth/mfa-policy';
import { MEDIOS_PAGO } from '@/lib/graphql/resolvers/pago/types';

async function testWithRetry(): Promise<void> {
  let n = 0;
  const result = await withRetry(
    async () => {
      n += 1;
      if (n < 3) {
        throw new Error('transient');
      }
      return 'ok';
    },
    { maxAttempts: 3, baseDelayMs: 1 },
  );
  assert.equal(result, 'ok');
  assert.equal(n, 3);
}

function testMediosPagoCatalogo(): void {
  assert.ok(MEDIOS_PAGO.includes('EFECTIVO'));
  assert.ok(MEDIOS_PAGO.includes('TRANSFERENCIA'));
  assert.equal(rolRequiereMfa('ADMIN'), true);
  assert.equal(calcularMfaSetupRequired('COBRADOR', false), false);
}

void testWithRetry()
  .then(() => {
    testMediosPagoCatalogo();
    console.warn('backend-mejoras unit helpers: OK');
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
