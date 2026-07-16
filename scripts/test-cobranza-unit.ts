import assert from 'node:assert/strict';
import { puedeTransicionar } from '@/lib/cobranza/estado-prestamo-service';
import {
  presetCoincideConFiltros,
  PRESETS_BANDEJA_SISTEMA,
} from '@/lib/cobranza/bandeja-presets';
import { calcularAbonoCuotasPorTotal } from '@/lib/cobranza/acuerdo-cuota-service';
import { construirNarrativaInforme } from '@/lib/cobranza/informe-gerencial-narrativa';
import { parseReferenciasPrestamo } from '@/lib/cobranza/parse-referencias-prestamo';
import { parsePeriodo } from '@/lib/cobranza/periodo-utils';

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

function testNarrativaInformeGerencial(): void {
  const n = construirNarrativaInforme({
    periodoLabel: '1 al 30 de junio del 2026',
    proximoPeriodoLabel: 'Julio 2026',
    indicadores: {
      montoRecuperado: 125154.23,
      acuerdosFormalizados: 15,
      acuerdosCumplidos: 15,
      acuerdosIncumplidos: 0,
      eficaciaAcuerdosPct: 100,
      totalGestiones: 120,
    },
    pctCarteraCritica: 60,
    acuerdosSinFechaInicio: 0,
  });
  assert.ok(n.resumenEjecutivo.includes('junio'));
  assert.equal(n.hallazgosPositivos.length, 3);
  assert.ok(n.valoracionGeneral.includes('cumplidos mientras no se registren'));
  assert.ok(n.conclusion.includes('15 acuerdos'));
}

testTransicionesEstado();
testBandejaPresets();
testAbonoCuotasAcumulado();
testNarrativaInformeGerencial();

function testParseReferenciasPrestamo(): void {
  assert.deepEqual(
    parseReferenciasPrestamo('A\nB\nA, C; D\tE'),
    ['A', 'B', 'C', 'D', 'E'],
  );
  assert.deepEqual(parseReferenciasPrestamo('  \n , ; '), []);
}

testParseReferenciasPrestamo();

function testParsePeriodoUtcIncluyeDiaUno(): void {
  const { inicio, fin } = parsePeriodo('2026-06');
  const pagoDiaUno = new Date('2026-06-01T00:00:00.000Z');
  const pagoUltimo = new Date('2026-06-30T23:59:59.000Z');
  const pagoFuera = new Date('2026-07-01T00:00:00.000Z');

  assert.equal(inicio.toISOString(), '2026-06-01T00:00:00.000Z');
  assert.equal(fin.toISOString(), '2026-07-01T00:00:00.000Z');
  assert.ok(pagoDiaUno >= inicio && pagoDiaUno < fin);
  assert.ok(pagoUltimo >= inicio && pagoUltimo < fin);
  assert.ok(!(pagoFuera >= inicio && pagoFuera < fin));
}

testParsePeriodoUtcIncluyeDiaUno();
console.log('tests unitarios cobranza: OK');
