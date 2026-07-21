import assert from 'node:assert/strict';
import { validarCronAuth } from '@/lib/cron/cron-auth';
import { calcularProximaEjecucion } from '@/lib/cron/cron-schedule';
import { cronEstadoRequiereAlerta } from '@/lib/cobranza/cron-alerta-email-service';

function testCronAuthBearer(): void {
  const secret = 'test-secret-123';
  process.env.CRON_SECRET = secret;

  const ok = new Request('http://localhost/api/cron/test', {
    headers: { authorization: `Bearer ${secret}` },
  });
  assert.equal(validarCronAuth(ok), true);

  const bad = new Request('http://localhost/api/cron/test', {
    headers: { authorization: 'Bearer wrong' },
  });
  assert.equal(validarCronAuth(bad), false);
}

function testCronAuthQueryTokenRejected(): void {
  process.env.CRON_SECRET = 'query-token';
  const req = new Request(
    'http://localhost/api/cron/test?token=query-token',
  );
  assert.equal(validarCronAuth(req), false);
}

function testProximaEjecucion(): void {
  const desde = new Date('2026-07-07T10:00:00');
  const proxima = calcularProximaEjecucion('0 6 * * *', desde);
  assert.ok(proxima);
  assert.equal(proxima.getHours(), 6);
  assert.ok(proxima > desde);
}

function testCronAlertaEstados(): void {
  assert.equal(cronEstadoRequiereAlerta('OK'), false);
  assert.equal(cronEstadoRequiereAlerta('OMITIDO'), false);
  assert.equal(cronEstadoRequiereAlerta('ERROR'), true);
  assert.equal(cronEstadoRequiereAlerta('PARCIAL'), true);
  assert.equal(cronEstadoRequiereAlerta('TIMEOUT'), true);
}

testCronAuthBearer();
testCronAuthQueryTokenRejected();
testProximaEjecucion();
testCronAlertaEstados();
console.warn('cron operativo: OK');
