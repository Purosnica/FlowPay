import assert from 'node:assert/strict';
import { puedeTransicionar } from '@/lib/cobranza/estado-prestamo-service';
import {
  presetCoincideConFiltros,
  PRESETS_BANDEJA_SISTEMA,
} from '@/lib/cobranza/bandeja-presets';

function testTransicionesEstado(): void {
  assert.equal(puedeTransicionar('Vigente', 'Vencido'), true);
  assert.equal(puedeTransicionar('Vencido', 'Castigo'), true);
  assert.equal(puedeTransicionar('Cancelado', 'Vigente'), false);
}

function testBandejaPresets(): void {
  const promesas = PRESETS_BANDEJA_SISTEMA.find(
    (p) => p.id === 'promesas_vencidas',
  );
  assert.ok(promesas);
  assert.equal(
    presetCoincideConFiltros(promesas, { soloPromesaVencida: true }),
    true,
  );
  assert.equal(
    presetCoincideConFiltros(promesas, { soloPromesaVencida: false }),
    false,
  );
}

testTransicionesEstado();
testBandejaPresets();
console.log('tests unitarios cobranza: OK');
