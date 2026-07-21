import assert from 'node:assert/strict';
import { puedeTransicionar } from '@/lib/cobranza/estado-prestamo-service';
import {
  presetCoincideConFiltros,
  PRESETS_BANDEJA_SISTEMA,
} from '@/lib/cobranza/bandeja-presets';
import { calcularAbonoCuotasPorTotal } from '@/lib/cobranza/acuerdo-cuota-service';
import { construirNarrativaInforme } from '@/lib/cobranza/informe-gerencial-narrativa';
import { parseReferenciasPrestamo } from '@/lib/cobranza/parse-referencias-prestamo';
import { parsePeriodo, filtroFechaEnPeriodo } from '@/lib/cobranza/periodo-utils';
import { resolverIdGestorPago } from '@/lib/cobranza/pago-atributacion';
import {
  folioComprobantePago,
  rutaComprobantePago,
  calcularSaldosComprobante,
  esPagoPosteriorAlComprobante,
} from '@/lib/logic/comprobante-pago-logic';

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

function testRangoMesRelativoYFiltros(): void {
  const junio = parsePeriodo('2026-06');
  // Congelar “actual” vía parsePeriodo + offset simulado
  const { inicio, fin } = junio;
  assert.equal(
    filtroFechaEnPeriodo(junio).gte.toISOString(),
    inicio.toISOString(),
  );
  assert.equal(
    filtroFechaEnPeriodo(junio).lt.toISOString(),
    fin.toISOString(),
  );

  // Mayo = junio - 1 mes (UTC)
  const mayoAncla = new Date(
    Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() - 1, 1),
  );
  const mayoPeriodo = `${mayoAncla.getUTCFullYear()}-${String(mayoAncla.getUTCMonth() + 1).padStart(2, '0')}`;
  assert.equal(mayoPeriodo, '2026-05');
  const mayo = parsePeriodo(mayoPeriodo);
  assert.equal(mayo.inicio.toISOString(), '2026-05-01T00:00:00.000Z');
  assert.equal(mayo.fin.toISOString(), '2026-06-01T00:00:00.000Z');
}

testRangoMesRelativoYFiltros();

function testResolverIdGestorPago(): void {
  assert.equal(
    resolverIdGestorPago({
      gestion: { idgestor: 7 },
      prestamo: { idgestorAsignado: 3 },
    }),
    7,
  );
  assert.equal(
    resolverIdGestorPago({
      gestion: null,
      prestamo: { idgestorAsignado: 3 },
    }),
    3,
  );
  assert.equal(
    resolverIdGestorPago({
      prestamo: { idgestorAsignado: null },
    }),
    null,
  );
}

testResolverIdGestorPago();

function testComprobantePagoLogic(): void {
  assert.equal(folioComprobantePago(42), 'FP-00000042');
  assert.equal(
    rutaComprobantePago(42),
    '/cobranza/pagos/42/comprobante',
  );

  const aplicado = calcularSaldosComprobante({
    saldoActual: 700,
    montoPago: 100,
    pagoAplicado: true,
    montosPagosAplicadosPosteriores: 200,
  });
  assert.equal(aplicado.saldoAnterior, 1000);
  assert.equal(aplicado.saldoNuevo, 900);

  const pendiente = calcularSaldosComprobante({
    saldoActual: 1000,
    montoPago: 150,
    pagoAplicado: false,
    montosPagosAplicadosPosteriores: 0,
  });
  assert.equal(pendiente.saldoAnterior, 1000);
  assert.equal(pendiente.saldoNuevo, 850);

  const fecha = new Date('2026-07-01T12:00:00.000Z');
  assert.equal(
    esPagoPosteriorAlComprobante({
      fechaPagoReferencia: fecha,
      idpagoReferencia: 10,
      fechaPago: fecha,
      idpago: 11,
    }),
    true,
  );
  assert.equal(
    esPagoPosteriorAlComprobante({
      fechaPagoReferencia: fecha,
      idpagoReferencia: 10,
      fechaPago: new Date('2026-06-01T12:00:00.000Z'),
      idpago: 99,
    }),
    false,
  );
}

testComprobantePagoLogic();
process.stdout.write('tests unitarios cobranza: OK\n');
