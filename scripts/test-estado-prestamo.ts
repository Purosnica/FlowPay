import assert from 'node:assert/strict';
import { puedeTransicionar } from '@/lib/cobranza/estado-prestamo-service';

assert.equal(puedeTransicionar('Con acuerdo', 'Castigo'), true);
assert.equal(puedeTransicionar('Castigo', 'Cancelado'), true);
assert.equal(puedeTransicionar('Finalizado', 'Vigente'), false);

console.log('estado-prestamo transiciones extendidas: OK');
