/**
 * Tests: parseInputNumber + mensajes seguros (simulador de acuerdo).
 */
import assert from 'node:assert/strict';
import { parseInputNumber } from '@/lib/utils/number';
import { esMensajeClienteSeguro } from '@/lib/errors/client-safe-message';

function testParseInputNumber(): void {
  assert.equal(parseInputNumber(''), null);
  assert.equal(parseInputNumber('   '), null);
  assert.equal(parseInputNumber('045'), 45);
  assert.equal(parseInputNumber('0'), 0);
  assert.equal(parseInputNumber('0.5'), 0.5);
  assert.equal(parseInputNumber('10'), 10);
  assert.equal(parseInputNumber('40'), 40);
  assert.equal(parseInputNumber('abc'), null);
  assert.equal(parseInputNumber('Infinity'), null);
  assert.equal(parseInputNumber('-3'), -3);
}

function testMensajesEnmascaradosNoSonSeguros(): void {
  assert.equal(esMensajeClienteSeguro('Unexpected error.'), false);
  assert.equal(esMensajeClienteSeguro('Unexpected error'), false);
  assert.equal(esMensajeClienteSeguro('Internal Server Error'), false);
  assert.equal(
    esMensajeClienteSeguro(
      'El descuento 45% excede el máximo autorizado para el mandante (40%).',
    ),
    true,
  );
}

function main(): void {
  testParseInputNumber();
  testMensajesEnmascaradosNoSonSeguros();
  // eslint-disable-next-line no-console
  console.warn('test-acuerdo-simulator-input: OK');
}

main();
