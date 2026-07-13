import assert from 'node:assert/strict';
import { puedeTransicionar } from '@/lib/cobranza/estado-prestamo-service';
import {
  presetCoincideConFiltros,
  PRESETS_BANDEJA_SISTEMA,
} from '@/lib/cobranza/bandeja-presets';
import { calcularAbonoCuotasPorTotal } from '@/lib/cobranza/acuerdo-cuota-service';

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

function testAbonoCuotasAcumulado(): void {
  const cuotas = [
    { idcuota: 1, numeroCuota: 1, montoCuota: 100, estado: 'PENDIENTE' },
    { idcuota: 2, numeroCuota: 2, montoCuota: 100, estado: 'PENDIENTE' },
    { idcuota: 3, numeroCuota: 3, montoCuota: 100, estado: 'PENDIENTE' },
  ];

  // Pago parcial: no marca ninguna aún
  const parcial = calcularAbonoCuotasPorTotal(cuotas, 50);
  assert.deepEqual(
    parcial.map((r) => r.estadoNuevo),
    ['PENDIENTE', 'PENDIENTE', 'PENDIENTE'],
  );

  // Acumulado cubre 1 cuota
  const una = calcularAbonoCuotasPorTotal(cuotas, 100);
  assert.deepEqual(
    una.map((r) => r.estadoNuevo),
    ['PAGADA', 'PENDIENTE', 'PENDIENTE'],
  );

  // Cubre 1.5 → solo 1 PAGADA (resto abona la siguiente sin marcarla)
  const unaYMedia = calcularAbonoCuotasPorTotal(cuotas, 150);
  assert.deepEqual(
    unaYMedia.map((r) => r.estadoNuevo),
    ['PAGADA', 'PENDIENTE', 'PENDIENTE'],
  );

  // Cubre 2 cuotas
  const dos = calcularAbonoCuotasPorTotal(cuotas, 200);
  assert.deepEqual(
    dos.map((r) => r.estadoNuevo),
    ['PAGADA', 'PAGADA', 'PENDIENTE'],
  );

  // Preserva VENCIDA si no se cubre
  const conVencida = calcularAbonoCuotasPorTotal(
    [
      { idcuota: 1, numeroCuota: 1, montoCuota: 100, estado: 'VENCIDA' },
      { idcuota: 2, numeroCuota: 2, montoCuota: 100, estado: 'PENDIENTE' },
    ],
    40,
  );
  assert.equal(conVencida[0]?.estadoNuevo, 'VENCIDA');
  assert.equal(conVencida[1]?.estadoNuevo, 'PENDIENTE');
}

testTransicionesEstado();
testBandejaPresets();
testAbonoCuotasAcumulado();
console.log('tests unitarios cobranza: OK');
