import assert from 'node:assert/strict';

import {
  diaSemanaIsoEnZona,
  finDiaEnZona,
  formatFechaHoraNegocio,
  inicioDiaEnZona,
  minutosDelDiaEnZona,
  partesEnZona,
  parseFechaCalendarioNegocio,
  TZ_NEGOCIO,
  zonedWallTimeToUtc,
} from '@/lib/utils/timezone';

function testPartesManagua(): void {
  // 14:00 UTC = 08:00 Managua (UTC-6)
  const fecha = new Date('2026-07-22T14:00:00.000Z');
  const p = partesEnZona(fecha, TZ_NEGOCIO);
  assert.equal(p.year, 2026);
  assert.equal(p.month, 7);
  assert.equal(p.day, 22);
  assert.equal(p.hour, 8);
  assert.equal(p.minute, 0);
  assert.equal(minutosDelDiaEnZona(fecha), 8 * 60);
}

function testHorarioLegalVentana(): void {
  // 08:00 Managua → permitido (>= 08:00)
  const inicio = new Date('2026-07-22T14:00:00.000Z');
  assert.equal(minutosDelDiaEnZona(inicio), 8 * 60);

  // 19:00 Managua = 01:00 UTC del día siguiente
  const finCorrecto = new Date('2026-07-23T01:00:00.000Z');
  assert.equal(minutosDelDiaEnZona(finCorrecto), 19 * 60);

  // 07:59 Managua = 13:59 UTC → fuera de ventana matutina
  const temprano = new Date('2026-07-22T13:59:00.000Z');
  assert.ok(minutosDelDiaEnZona(temprano) < 8 * 60);

  // 19:01 Managua = 01:01 UTC del día siguiente
  const tarde = new Date('2026-07-23T01:01:00.000Z');
  assert.ok(minutosDelDiaEnZona(tarde) > 19 * 60);
}

function testDiaSemanaMiercoles(): void {
  // 2026-07-22 es miércoles → ISO 3
  const fecha = new Date('2026-07-22T18:00:00.000Z');
  assert.equal(diaSemanaIsoEnZona(fecha), 3);
}

function testInicioFinDia(): void {
  const fecha = new Date('2026-07-22T18:00:00.000Z');
  const inicio = inicioDiaEnZona(fecha);
  const fin = finDiaEnZona(fecha);
  // 00:00 Managua = 06:00 UTC
  assert.equal(inicio.toISOString(), '2026-07-22T06:00:00.000Z');
  assert.equal(fin.toISOString(), '2026-07-23T06:00:00.000Z');
}

function testParseCalendario(): void {
  const d = parseFechaCalendarioNegocio('2026-07-22');
  assert.ok(d);
  assert.equal(d.toISOString(), '2026-07-22T06:00:00.000Z');
}

function testZonedWallTime(): void {
  const d = zonedWallTimeToUtc(2026, 7, 22, 8, 30, 0);
  assert.equal(d.toISOString(), '2026-07-22T14:30:00.000Z');
}

function testFormatNegocio(): void {
  const s = formatFechaHoraNegocio('2026-07-22T14:00:00.000Z', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  assert.ok(s.includes('08'));
}

testPartesManagua();
testHorarioLegalVentana();
testDiaSemanaMiercoles();
testInicioFinDia();
testParseCalendario();
testZonedWallTime();
testFormatNegocio();

console.warn('test-timezone-unit: OK');
