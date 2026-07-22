/**
 * Tests unitarios I047 — mensaje WhatsApp comprobante.
 */

import assert from 'node:assert/strict';
import {
  enlaceWhatsAppComprobante,
  mensajeComprobanteWhatsApp,
} from '../src/lib/logic/comprobante-whatsapp-logic';

const sample = {
  folio: 'FP-00000001',
  noPrestamo: 'PREST-1',
  nombreCliente: 'Ana Pérez',
  monto: 100,
  moneda: 'NIO',
  saldoNuevo: 900,
  fechaPago: '2026-07-21T12:00:00.000Z',
  mandanteNombre: 'Mandante Demo',
};

const msg = mensajeComprobanteWhatsApp(sample);
assert.ok(msg.includes('FP-00000001'));
assert.ok(msg.includes('Ana Pérez'));
assert.ok(msg.includes('PREST-1'));

const conTel = enlaceWhatsAppComprobante(sample, '50588887777');
assert.ok(conTel.startsWith('https://wa.me/'));
assert.ok(conTel.includes('text='));

const sinTel = enlaceWhatsAppComprobante(sample, null);
assert.equal(sinTel.startsWith('https://wa.me/?text='), true);

console.warn('test-comprobante-whatsapp: OK');
