/**
 * Tests unitarios: registro automático de gestión por canal.
 */
import assert from 'node:assert/strict';
import {
  canalGestionDesdeTexto,
  codigoAccionPorCanal,
  construirNotaGestionContacto,
  etiquetaCanalGestion,
  resolverIdCodAccionPorCanal,
} from '@/lib/logic/gestion-contacto-auto-logic';
import {
  canalGestionDesdeAccion,
  etiquetaCanalAccion,
  resolverAccionContacto,
} from '@/lib/logic/secuencia-lote-logic';
import type { AgendaSecuenciaItem } from '@/types/cobranza';

function itemBase(
  overrides: Partial<AgendaSecuenciaItem> = {},
): AgendaSecuenciaItem {
  return {
    idprestamo: 1,
    idpaso: 10,
    idsecuencia: 1,
    idmandante: 1,
    diasDesdeInicio: 0,
    noPrestamo: 'P-1',
    nombreCliente: 'Cliente Demo',
    telefono: '88887777',
    email: 'demo@example.com',
    canal: 'WHATSAPP',
    accion: 'Recordatorio',
    saldoTotal: 100,
    diasMora: 5,
    interesMoratorio: 0,
    gestionCobranza: 0,
    moneda: 'NIO',
    mandanteNombre: 'Mandante',
    idplantilla: null,
    plantillaNombre: null,
    plantillaContenido: null,
    ...overrides,
  };
}

function testCodigosYNotas(): void {
  assert.equal(codigoAccionPorCanal('LLAMADA'), 'LLC');
  assert.equal(codigoAccionPorCanal('WHATSAPP'), 'TTC');
  assert.equal(codigoAccionPorCanal('SMS'), 'SMS');
  assert.equal(codigoAccionPorCanal('EMAIL'), 'CE');

  assert.ok(etiquetaCanalGestion('LLAMADA').includes('Llamada'));
  assert.equal(
    construirNotaGestionContacto('SMS'),
    'Contacto automático — SMS',
  );
  assert.ok(
    construirNotaGestionContacto('WHATSAPP', {
      mensajeSnippet: 'Hola deudor',
    }).includes('Hola deudor'),
  );

  const id = resolverIdCodAccionPorCanal(
    [
      { idcodaccion: 3, codigo: 'TTC' },
      { idcodaccion: 7, codigo: 'LLC' },
    ],
    'LLAMADA',
  );
  assert.equal(id, 7);
  assert.equal(
    resolverIdCodAccionPorCanal([{ idcodaccion: 1, codigo: 'TMC' }], 'SMS'),
    undefined,
  );
}

function testCanalDesdeTexto(): void {
  assert.equal(canalGestionDesdeTexto('llamada'), 'LLAMADA');
  assert.equal(canalGestionDesdeTexto('TELEFONO'), 'LLAMADA');
  assert.equal(canalGestionDesdeTexto('whatsapp'), 'WHATSAPP');
  assert.equal(canalGestionDesdeTexto('sms'), 'SMS');
  assert.equal(canalGestionDesdeTexto('email'), 'EMAIL');
  assert.equal(canalGestionDesdeTexto('carta'), null);
}

function testSecuenciaLlamada(): void {
  const llamada = resolverAccionContacto(itemBase({ canal: 'LLAMADA' }));
  assert.equal(llamada.tipo, 'llamada');
  if (llamada.tipo === 'llamada') {
    assert.ok(llamada.url.startsWith('tel:'));
  }
  assert.equal(etiquetaCanalAccion(llamada), 'Llamada');
  assert.equal(
    canalGestionDesdeAccion(itemBase({ canal: 'LLAMADA' }), llamada),
    'LLAMADA',
  );

  const wa = resolverAccionContacto(itemBase({ canal: 'WHATSAPP' }));
  assert.equal(wa.tipo, 'whatsapp');
  assert.equal(
    canalGestionDesdeAccion(itemBase(), wa),
    'WHATSAPP',
  );
}

function main(): void {
  testCodigosYNotas();
  testCanalDesdeTexto();
  testSecuenciaLlamada();
  // eslint-disable-next-line no-console -- script CLI
  console.log('OK test-gestion-contacto-auto');
}

main();
