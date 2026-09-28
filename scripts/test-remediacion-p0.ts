import assert from 'node:assert/strict';
import { calcularDiasMora } from '@/lib/cobranza/dias-mora-service';
import { zonedWallTimeToUtc } from '@/lib/utils/timezone';
import { calcularWaterfallAplicacion, componentesDesdePrestamo } from '@/lib/logic/pago-waterfall-logic';

const componentes = componentesDesdePrestamo({
  gestionCobranza: 0, cargosAdmin: 0, comisionCav: 0, comisionInsitu: 0,
  seguroSvsd: 0, mantenimientoValor: 0, interes: 100, montoPrestamo: 900,
});
const pago = calcularWaterfallAplicacion(componentes, 1_000);
assert.equal(pago.componentesNuevos.montoPrestamo, 0);
assert.equal(pago.componentesNuevos.interes, 0);

const vencimiento = zonedWallTimeToUtc(2026, 6, 10, 0, 0, 0);
const siguienteDia = zonedWallTimeToUtc(2026, 6, 11, 0, 1, 0);
assert.equal(calcularDiasMora({
  fechaVencimiento: vencimiento, ultimaFechaPago: null, saldoTotal: 1,
  estado: 'Vencido', acuerdoVigente: false, fechaInicioAcuerdo: null,
  fechaCalculo: siguienteDia,
}), 1);

console.log('remediacion-p0: OK');
