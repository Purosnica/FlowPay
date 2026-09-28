import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parsearExtractoBancario } from '@/lib/cobranza/conciliacion-extracto-parser';

function workbookBuffer(rows: Array<Record<string, unknown>>): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

function testParseValido(): void {
  const buffer = workbookBuffer([
    {
      Fecha: '28/09/2026',
      Referencia: ' TRX-001 / 25 ',
      Descripcion: 'Abono cliente',
      Credito: '1,250.50',
      Moneda: 'NIO',
    },
    {
      Fecha: '27/09/2026',
      Referencia: 'TRX002',
      Debito: 99.25,
      Moneda: 'NIO',
    },
  ]);

  const result = parsearExtractoBancario(buffer, {
    monedaDefault: 'NIO',
  });
  assert.deepEqual(result.errores, []);
  assert.equal(result.lineas.length, 2);
  assert.equal(result.lineas[0]?.monto, '1250.50');
  assert.equal(result.lineas[0]?.referencia, 'TRX-001 / 25');
  assert.equal(result.lineas[1]?.monto, '99.25');
}

function testFilaInvalidaBloquea(): void {
  const buffer = workbookBuffer([
    { Fecha: '', Referencia: 'BAD', Monto: 'abc', Moneda: 'NIO' },
  ]);
  const result = parsearExtractoBancario(buffer, { monedaDefault: 'NIO' });
  assert.equal(result.lineas.length, 0);
  assert.ok(result.errores.some((x) => x.includes('fecha')));
  assert.ok(result.errores.some((x) => x.includes('monto')));
}

testParseValido();
testFilaInvalidaBloquea();
console.warn('conciliacion-extracto-parser: OK');
