import assert from 'node:assert/strict';
import { calcularDiasMora } from '@/lib/cobranza/dias-mora-service';

function fecha(d: string): Date {
  const f = new Date(d);
  f.setHours(0, 0, 0, 0);
  return f;
}

function testSinSaldo(): void {
  assert.equal(
    calcularDiasMora({
      fechaVencimiento: fecha('2026-01-01'),
      ultimaFechaPago: null,
      saldoTotal: 0,
      estado: 'Vencido',
      acuerdoVigente: false,
      fechaInicioAcuerdo: null,
      fechaCalculo: fecha('2026-02-01'),
    }),
    0,
  );
}

function testCancelado(): void {
  assert.equal(
    calcularDiasMora({
      fechaVencimiento: fecha('2026-01-01'),
      ultimaFechaPago: null,
      saldoTotal: 1000,
      estado: 'Cancelado',
      acuerdoVigente: false,
      fechaInicioAcuerdo: null,
      fechaCalculo: fecha('2026-02-01'),
    }),
    0,
  );
}

function testMoraDesdeVencimiento(): void {
  assert.equal(
    calcularDiasMora({
      fechaVencimiento: fecha('2026-01-01'),
      ultimaFechaPago: null,
      saldoTotal: 5000,
      estado: 'Vencido',
      acuerdoVigente: false,
      fechaInicioAcuerdo: null,
      fechaCalculo: fecha('2026-01-31'),
      diasGracia: 0,
    }),
    30,
  );
}

function testAntesDeVencimiento(): void {
  assert.equal(
    calcularDiasMora({
      fechaVencimiento: fecha('2026-02-15'),
      ultimaFechaPago: fecha('2026-02-01'),
      saldoTotal: 5000,
      estado: 'Vigente',
      acuerdoVigente: false,
      fechaInicioAcuerdo: null,
      fechaCalculo: fecha('2026-02-01'),
    }),
    0,
  );
}

function testDiasGracia(): void {
  assert.equal(
    calcularDiasMora({
      fechaVencimiento: fecha('2026-01-01'),
      ultimaFechaPago: null,
      saldoTotal: 5000,
      estado: 'Vencido',
      acuerdoVigente: false,
      fechaInicioAcuerdo: null,
      fechaCalculo: fecha('2026-01-10'),
      diasGracia: 5,
    }),
    4,
  );
}

function testAcuerdoVigenteCongelaMora(): void {
  assert.equal(
    calcularDiasMora({
      fechaVencimiento: fecha('2026-01-01'),
      ultimaFechaPago: null,
      saldoTotal: 5000,
      estado: 'Con acuerdo',
      acuerdoVigente: true,
      fechaInicioAcuerdo: fecha('2026-01-20'),
      fechaCalculo: fecha('2026-03-01'),
      diasGracia: 0,
    }),
    19,
  );
}

function testAcuerdoRotoRecalcula(): void {
  assert.equal(
    calcularDiasMora({
      fechaVencimiento: fecha('2026-01-01'),
      ultimaFechaPago: null,
      saldoTotal: 5000,
      estado: 'Vencido',
      acuerdoVigente: false,
      fechaInicioAcuerdo: null,
      fechaCalculo: fecha('2026-03-01'),
      diasGracia: 0,
    }),
    59,
  );
}

testSinSaldo();
testCancelado();
testMoraDesdeVencimiento();
testAntesDeVencimiento();
testDiasGracia();
testAcuerdoVigenteCongelaMora();
testAcuerdoRotoRecalcula();
console.log('dias-mora-service: OK');
