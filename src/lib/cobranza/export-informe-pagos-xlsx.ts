import type { InformeGerencialPagoItem } from '@/types/cobranza';
import * as XLSX from 'xlsx';

/**
 * Exporta el detalle de pagos del informe gerencial (sección 6).
 */
export function exportInformePagosXlsx(
  pagos: InformeGerencialPagoItem[],
  opts: { mandanteNombre: string; periodo: string },
): void {
  const rows = pagos.map((p) => ({
    Cliente: p.cliente,
    'N° Prestamo': p.noPrestamo,
    CODIGO_UNICO: p.codigoUnico,
    'MONTO ORIGINAL (Córdobas)': p.montoOriginal,
    pagado: p.montoPagado,
    Fecha: p.fechaPago,
    'Banco-Referencia': p.medioReferencia,
    Ejecutivo: p.ejecutivo,
    'Depto/ciud': p.departamentoCiudad,
    Sucursal: p.sucursal,
    'Tramo de Mora': p.diasMora,
  }));

  const totalPagado = pagos.reduce((s, p) => s + p.montoPagado, 0);
  rows.push({
    Cliente: 'TOTAL',
    'N° Prestamo': '',
    CODIGO_UNICO: '',
    'MONTO ORIGINAL (Córdobas)': 0,
    pagado: totalPagado,
    Fecha: '',
    'Banco-Referencia': '',
    Ejecutivo: '',
    'Depto/ciud': '',
    Sucursal: '',
    'Tramo de Mora': 0,
  });

  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Pagos');
  const safeName = opts.mandanteNombre.replace(/[^\w\-]+/g, '_').slice(0, 40);
  XLSX.writeFile(book, `Informe_pagos_${safeName}_${opts.periodo}.xlsx`);
}
