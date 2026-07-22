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
import {
  puedeAnularLiquidacion,
  puedeEmitirLiquidacion,
  puedeMarcarLiquidacionPagada,
  puedeRegenerarLiquidacion,
  puedeRevertirLiquidacionPagada,
} from '@/lib/logic/liquidacion-estado-logic';
import {
  aplicarWaterfallReverso,
  calcularWaterfallAplicacion,
  componentesDesdePrestamo,
  parseAsignacionWaterfall,
  serializarAsignacionWaterfall,
} from '@/lib/logic/pago-waterfall-logic';
import {
  debeCondonarResidualTrasAcuerdo,
  montosCondonacionResidual,
} from '@/lib/logic/acuerdo-condonacion-logic';
import {
  puedeAsignarRol,
  puedeEditarPermisosDelRol,
} from '@/lib/logic/rol-privilege-logic';
import {
  puedeEmitirComoChecker,
  puedeMarcarPagadaComoChecker,
} from '@/lib/logic/liquidacion-sod-logic';
import {
  debePreservarSaldoVivo,
  normalizarEstadoImportacion,
} from '@/lib/logic/import-saldo-policy-logic';
import { calcularAbonoPlanCuotas } from '@/lib/logic/prestamo-cuota-pago-logic';
import {
  acuerdoCumplidoPorPagos,
  calcularMetaPagableAcuerdo,
} from '@/lib/logic/acuerdo-meta-pagable-logic';
import { simularAcuerdo } from '@/lib/cobranza/acuerdo-simulator';
import {
  ESTADO_PROMESA,
  esPromesaAbierta,
  promesaCumplidaPorMonto,
  resolverEstadoPromesa,
} from '@/lib/logic/promesa-estado-logic';
import { claveMetaMandante } from '@/lib/cobranza/configuracion-cobranza-service';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_MESSAGE,
  PASSWORD_COMPLEXITY_MESSAGE,
  cumpleComplejidadPassword,
} from '@/lib/logic/password-policy-logic';
import { convertirMontoAMonedaBase } from '@/lib/logic/liquidacion-fx-logic';
import { construirMontosRapidos } from '@/lib/logic/pago-montos-rapidos-logic';
import {
  moverIndiceCola,
  siguienteIdEnCola,
} from '@/lib/logic/cola-operativa-logic';
import { enlaceLlamadaTelefonica } from '@/lib/logic/contacto-rapido-logic';
import {
  filtrosBandejaDesdeSearchParams,
  searchParamsDesdeFiltrosBandeja,
} from '@/lib/logic/bandeja-url-filters-logic';
import { filtrarNavPorRol } from '@/lib/navigation/filter-nav-por-rol';
import type { NavSection } from '@/lib/navigation/filter-nav-by-permisos';

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
  assert.ok(n.valoracionGeneral.includes('acuerdo(s) cumplidos'));
  assert.ok(!n.valoracionGeneral.includes('mientras no se registren'));
  assert.ok(n.conclusion.includes('Solo los acuerdos en estado CUMPLIDO'));
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
  assert.equal(folioComprobantePago(1), 'FP-00000001');
  assert.equal(folioComprobantePago(100000000), 'FP-100000000');
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

function testLiquidacionEstadoLogic(): void {
  assert.equal(puedeRegenerarLiquidacion('BORRADOR'), true);
  assert.equal(puedeRegenerarLiquidacion('EMITIDA'), false);
  assert.equal(puedeRegenerarLiquidacion('PAGADA'), false);
  assert.equal(puedeAnularLiquidacion('BORRADOR'), true);
  assert.equal(puedeAnularLiquidacion('PAGADA'), false);
  assert.equal(puedeEmitirLiquidacion('BORRADOR'), true);
  assert.equal(puedeMarcarLiquidacionPagada('EMITIDA'), true);
  assert.equal(puedeRevertirLiquidacionPagada('PAGADA'), true);
}

function testPagoWaterfallLogic(): void {
  const base = componentesDesdePrestamo({
    gestionCobranza: 50,
    cargosAdmin: 20,
    comisionCav: 0,
    comisionInsitu: 0,
    seguroSvsd: 0,
    mantenimientoValor: 0,
    interes: 100,
    montoPrestamo: 830,
  });
  const { asignacion, componentesNuevos } = calcularWaterfallAplicacion(
    base,
    80,
  );
  assert.equal(asignacion.gestionCobranza, 50);
  assert.equal(asignacion.cargosAdmin, 20);
  assert.equal(asignacion.interes, 10);
  assert.equal(componentesNuevos.gestionCobranza, 0);
  assert.equal(componentesNuevos.cargosAdmin, 0);
  assert.equal(componentesNuevos.interes, 90);
  assert.equal(componentesNuevos.montoPrestamo, 830);

  const restaurado = aplicarWaterfallReverso(componentesNuevos, asignacion);
  assert.equal(restaurado.gestionCobranza, 50);
  assert.equal(restaurado.cargosAdmin, 20);
  assert.equal(restaurado.interes, 100);

  const raw = serializarAsignacionWaterfall(asignacion);
  const parsed = parseAsignacionWaterfall(raw);
  assert.ok(parsed);
  assert.equal(parsed?.gestionCobranza, 50);
}

function testAcuerdoCondonacionLogic(): void {
  assert.equal(debeCondonarResidualTrasAcuerdo(100), true);
  assert.equal(debeCondonarResidualTrasAcuerdo(0), false);
  assert.equal(debeCondonarResidualTrasAcuerdo(0.004), false);
  const m = montosCondonacionResidual({
    saldoTotal: 150,
    interesMoratorio: 40,
  });
  assert.equal(m.saldoCondonado, 150);
  assert.equal(m.moratorioCondonado, 40);
}

testLiquidacionEstadoLogic();
testPagoWaterfallLogic();
testAcuerdoCondonacionLogic();

function testRolPrivilegeYSod(): void {
  assert.equal(
    puedeAsignarRol({ codigoActor: 'ADMIN', codigoRolObjetivo: 'ADMIN' }),
    true,
  );
  assert.equal(
    puedeAsignarRol({
      codigoActor: 'GERENTE',
      codigoRolObjetivo: 'ADMIN',
    }),
    false,
  );
  assert.equal(
    puedeAsignarRol({
      codigoActor: 'GERENTE',
      codigoRolObjetivo: 'COBRADOR',
    }),
    true,
  );
  assert.equal(
    puedeEditarPermisosDelRol({
      codigoActor: 'GERENTE',
      codigoRolObjetivo: 'ADMIN',
    }),
    false,
  );
  assert.equal(
    puedeEmitirComoChecker({
      idusuarioActor: 2,
      idusuarioCreacion: 1,
    }),
    true,
  );
  assert.equal(
    puedeEmitirComoChecker({
      idusuarioActor: 1,
      idusuarioCreacion: 1,
    }),
    false,
  );
  assert.equal(
    puedeMarcarPagadaComoChecker({
      idusuarioActor: 1,
      idusuarioEmision: 1,
    }),
    false,
  );
  assert.equal(debePreservarSaldoVivo({ cantidadPagosAplicados: 1 }), true);
  assert.equal(debePreservarSaldoVivo({ cantidadPagosAplicados: 0 }), false);
  assert.equal(normalizarEstadoImportacion('vencido'), 'Vencido');
  assert.equal(normalizarEstadoImportacion('xyz'), null);
}

testRolPrivilegeYSod();

function testPrestamoCuotaYMetaAcuerdo(): void {
  const abonos = calcularAbonoPlanCuotas(
    [
      { idcuota: 1, numero: 1, saldo: 100, estado: 'PENDIENTE' },
      { idcuota: 2, numero: 2, saldo: 100, estado: 'PENDIENTE' },
    ],
    150,
  );
  assert.equal(abonos.length, 2);
  assert.equal(abonos[0].montoAplicado, 100);
  assert.equal(abonos[0].estadoNuevo, 'PAGADA');
  assert.equal(abonos[1].montoAplicado, 50);
  assert.equal(abonos[1].estadoNuevo, 'PENDIENTE');

  assert.equal(
    calcularMetaPagableAcuerdo({
      montoAcordado: 1080,
      saldoActual: 0,
      totalPagado: 1000,
      dispensarInteresMoratorio: false,
    }),
    1000,
  );
  assert.equal(
    acuerdoCumplidoPorPagos({
      montoAcordado: 1080,
      saldoActual: 0,
      totalPagado: 1000,
      dispensarInteresMoratorio: false,
    }),
    true,
  );

  const sim = simularAcuerdo({
    saldoTotal: 1000,
    interesMoratorio: 200,
    porcentajeDesc: 10,
    numeroCuotas: 1,
    dispensarInteresMoratorio: false,
  });
  assert.equal(sim.montoAcordado, 1080);
  assert.equal(sim.montoPagableLedger, 1000);
}

function testPromesaEstadoYConfigMandante(): void {
  assert.equal(
    resolverEstadoPromesa({
      estadoPromesa: ESTADO_PROMESA.CUMPLIDA,
      nota: '',
      tienePromesa: true,
    }),
    ESTADO_PROMESA.CUMPLIDA,
  );
  assert.equal(
    resolverEstadoPromesa({
      estadoPromesa: null,
      nota: 'ok [PROMESA_VENCIDA] x',
      tienePromesa: true,
    }),
    ESTADO_PROMESA.VENCIDA,
  );
  assert.equal(
    esPromesaAbierta({
      estadoPromesa: ESTADO_PROMESA.PENDIENTE,
      tienePromesa: true,
    }),
    true,
  );
  assert.equal(
    promesaCumplidaPorMonto({
      montoPromesa: 100,
      montoAcumuladoPagos: 99,
    }),
    true,
  );
  assert.equal(
    promesaCumplidaPorMonto({
      montoPromesa: 100,
      montoAcumuladoPagos: 98,
    }),
    false,
  );
  assert.equal(
    claveMetaMandante('cobranza.dias_mora_castigo', 7),
    'cobranza.dias_mora_castigo.mandante.7',
  );
}

function testLiquidacionFxEInformeAcuerdos(): void {
  const nio = convertirMontoAMonedaBase({
    monto: 100,
    moneda: 'NIO',
    tipoCambio: null,
  });
  assert.equal(nio.montoBase, 100);
  assert.equal(nio.tipoCambioAplicado, 1);

  const usd = convertirMontoAMonedaBase({
    monto: 10,
    moneda: 'USD',
    tipoCambio: 36.5,
  });
  assert.equal(usd.montoBase, 365);
  assert.equal(usd.monedaOriginal, 'USD');

  assert.throws(() =>
    convertirMontoAMonedaBase({
      monto: 10,
      moneda: 'USD',
      tipoCambio: null,
    }),
  );

  assert.equal(PASSWORD_MIN_LENGTH, 8);
  assert.ok(PASSWORD_MIN_MESSAGE.includes('8'));
  assert.equal(cumpleComplejidadPassword('Abcd1234'), true);
  assert.equal(cumpleComplejidadPassword('abcdefgh'), false);
  assert.equal(cumpleComplejidadPassword('ABCDEFGH'), false);
  assert.equal(cumpleComplejidadPassword('Abcdefgh'), false);
  assert.ok(PASSWORD_COMPLEXITY_MESSAGE.includes('mayúscula'));
}

function testUxColaYMontosRapidos(): void {
  assert.equal(siguienteIdEnCola([10, 20, 30], 10), 20);
  assert.equal(siguienteIdEnCola([10, 20, 30], 30), null);
  assert.equal(siguienteIdEnCola([10, 20], 99), 10);
  assert.equal(moverIndiceCola(0, 3, 1), 1);
  assert.equal(moverIndiceCola(2, 3, 1), 2);
  assert.equal(moverIndiceCola(0, 3, -1), 0);

  const chips = construirMontosRapidos({
    saldoTotal: 1000,
    montoCuota: 200,
    montoPromesa: 150,
  });
  assert.equal(chips[0]?.label, 'Cuota');
  assert.equal(chips.some((c) => c.label === 'Saldo' && c.valor === 1000), true);
  assert.equal(chips.some((c) => c.label === '50%' && c.valor === 500), true);

  assert.equal(enlaceLlamadaTelefonica('8888-1234'), 'tel:88881234');
  assert.equal(enlaceLlamadaTelefonica(null), null);

  const params = searchParamsDesdeFiltrosBandeja(
    { soloPromesaVencida: true, idmandante: 5 },
    'ABC-1',
  );
  assert.equal(params.get('soloPromesaVencida'), '1');
  assert.equal(params.get('idmandante'), '5');
  assert.equal(params.get('search'), 'ABC-1');
  const parsed = filtrosBandejaDesdeSearchParams(params);
  assert.equal(parsed.soloPromesaVencida, true);
  assert.equal(parsed.idmandante, 5);
  assert.equal(parsed.search, 'ABC-1');

  const nav: NavSection[] = [
    {
      label: 'MAIN',
      items: [
        { title: 'Mi día', url: '/cobranza/mi-dia' },
        { title: 'Importar', url: '/cobranza/importar' },
        {
          title: 'Cobranza',
          items: [
            { title: 'Bandeja', url: '/cobranza/bandeja' },
            { title: 'Asignación', url: '/cobranza/asignacion' },
          ],
        },
      ],
    },
  ];
  const cobrador = filtrarNavPorRol(nav, 'COBRADOR');
  assert.equal(cobrador[0]?.items.length, 2);
  assert.equal(
    cobrador[0]?.items.find((i) => i.title === 'Cobranza')?.items?.length,
    1,
  );
}

testPrestamoCuotaYMetaAcuerdo();
testPromesaEstadoYConfigMandante();
testLiquidacionFxEInformeAcuerdos();
testUxColaYMontosRapidos();
process.stdout.write('tests unitarios cobranza: OK\n');
