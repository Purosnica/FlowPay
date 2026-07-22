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

async function testBcryptOnly(): Promise<void> {
  const { hashPassword, verifyPassword, isBcryptHash } = await import(
    '@/lib/auth/password'
  );
  const { hash, salt } = await hashPassword('flowpay-i016');
  assert.equal(isBcryptHash(hash), true);
  assert.equal(await verifyPassword('flowpay-i016', hash, salt), true);
  assert.equal(await verifyPassword('wrong', hash, salt), false);
  assert.equal(await verifyPassword('x', 'not-a-bcrypt-hash'), false);
}

void testWithRetry()
  .then(async () => {
    testMediosPagoCatalogo();
    await testBcryptOnly();
    const { ActualizarConfigCobranzaSchema, IdArgsSchema } = await import(
      '@/lib/validators/graphql-args'
    );
    const cfg = ActualizarConfigCobranzaSchema.parse({
      maxContactosDia: 5,
      diasMoraCastigo: 90,
    });
    assert.equal(cfg.maxContactosDia, 5);
    assert.equal(IdArgsSchema.parse({ id: 1 }).id, 1);
    assert.throws(() => IdArgsSchema.parse({ id: 0 }));
    console.warn('backend-mejoras unit helpers: OK');
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
