import assert from 'node:assert/strict';
import { authenticator } from 'otplib';
import {
  construirOtpauthUrl,
  generarSecretoTotp,
  verificarCodigoTotp,
} from '@/lib/auth/mfa-service';
import {
  cifrarSecretoMfa,
  descifrarSecretoMfa,
} from '@/lib/auth/mfa-crypto';
import {
  calcularMfaSetupRequired,
  rolRequiereMfa,
} from '@/lib/auth/mfa-policy';

process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-secret-mfa-unit-32chars-min!!';

function testTotpRoundtrip(): void {
  const secret = generarSecretoTotp();
  assert.ok(secret.length >= 16);
  const token = authenticator.generate(secret);
  assert.equal(verificarCodigoTotp(secret, token), true);
  assert.equal(verificarCodigoTotp(secret, '000000'), false);
  const url = construirOtpauthUrl('admin@flowpay.test', secret);
  assert.ok(url.startsWith('otpauth://totp/'));
}

function testCifradoSecreto(): void {
  const plain = 'JBSWY3DPEHPK3PXP';
  const enc = cifrarSecretoMfa(plain);
  assert.notEqual(enc, plain);
  assert.equal(descifrarSecretoMfa(enc), plain);
}

function testPoliticaMfa(): void {
  assert.equal(rolRequiereMfa('ADMIN'), true);
  assert.equal(rolRequiereMfa('GERENTE'), true);
  assert.equal(rolRequiereMfa('COBRADOR'), false);
  assert.equal(calcularMfaSetupRequired('ADMIN', false), true);
  assert.equal(calcularMfaSetupRequired('ADMIN', true), false);
  assert.equal(calcularMfaSetupRequired('COBRADOR', false), false);
}

testTotpRoundtrip();
testCifradoSecreto();
testPoliticaMfa();
console.warn('mfa unit: OK');
