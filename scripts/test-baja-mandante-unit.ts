import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parsearPtmOs } from '@/lib/cobranza/baja-mandante-service';

function xlsxPtmOs(cantidad: number): Buffer {
  const filas = [['numero_ptmo']];
  for (let i = 0; i < cantidad; i++) filas.push([String(i + 1).padStart(9, '0')]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas), 'Bajas');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

for (const cantidad of [1, 10, 100, 600, 1001]) {
  const filas = parsearPtmOs(xlsxPtmOs(cantidad), 'bajas.xlsx');
  assert.equal(filas.length, cantidad);
  assert.equal(filas[0]?.numeroPtmo, '000000001');
  assert.equal(filas.at(-1)?.numeroPtmo, String(cantidad).padStart(9, '0'));
  assert.equal(filas.some((f) => f.error), false);
}

const wbNumerico = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbNumerico, XLSX.utils.aoa_to_sheet([['numero_ptmo'], [123456]]), 'Bajas');
const numerico = parsearPtmOs(
  XLSX.write(wbNumerico, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
  'bajas.xlsx',
);
assert.match(numerico[0]?.error ?? '', /ceros iniciales/i);

const csv = Buffer.from('numero_ptmo\n000123456\n000123457\n', 'utf8');
assert.deepEqual(parsearPtmOs(csv, 'bajas.csv').map((f) => f.numeroPtmo), ['000123456', '000123457']);
assert.throws(() => parsearPtmOs(Buffer.from('otra_columna\n123\n'), 'bajas.csv'), /numero_ptmo/);

console.log('baja-mandante parser y cargas 1/10/100/600/1001: OK');
