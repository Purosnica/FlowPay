import assert from 'node:assert/strict';
import { normalizarReferenciaBancaria, resolverMatchingBancario } from '@/lib/cobranza/conciliacion-matching';

assert.equal(normalizarReferenciaBancaria(' ab- 12/3 '), 'AB123');
const pago = { idpago: 1, referencia: 'AB-123', monto: 100, moneda: 'NIO', fechaPago: new Date('2026-01-10T12:00:00Z') };
const linea = { referencia: 'ab 123', monto: 100, moneda: 'NIO', fechaOperacion: new Date('2026-01-10T00:00:00Z') };
assert.equal(resolverMatchingBancario(linea, [pago]).estado, 'MATCH_EXACT');
assert.equal(resolverMatchingBancario({ ...linea, monto: 101 }, [pago]).estado, 'SIN_COINCIDENCIA');
assert.equal(resolverMatchingBancario({ ...linea, referencia: null }, [pago, { ...pago, idpago: 2 }]).estado, 'AMBIGUO');
console.log('conciliacion-matching: OK');
