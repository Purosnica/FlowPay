import type { InformeGestionItem } from '@/types/cobranza';
import * as XLSX from 'xlsx';

const HEADERS = [
  'NUMERO DE PRESTAMO',
  'CODIGO UNICO CLTE',
  'NOMBRE CLIENTE',
  'CANT _ CTAS',
  'AGENCIA',
  'GESTOR',
  'FECHA GESTION',
  'TELEFONO CONTACTO',
  'COD_ ACC',
  'COD_RES',
  'NOTA DE GESTION',
  'RAZON MORA',
  'MONTO PROMESA',
  'FECHA GESTION PROXIMA',
  'COMENTARIO ADICIONAL',
  'TIPIFICACION',
  'MES',
  'PAGOS',
] as const;

function parseFechaLocal(iso: string): Date | '' {
  if (!iso) {
    return '';
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return '';
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day);
}

function numeroPrestamoValue(noPrestamo: string): string | number {
  const trimmed = noPrestamo.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

/**
 * Exporta gestiones al formato plantilla "Informe de gestiones".
 */
export function exportInformeGestionesXlsx(
  gestiones: InformeGestionItem[],
  opts: { mandanteNombre: string; periodo: string },
): void {
  const rows = gestiones.map((g) => ({
    [HEADERS[0]]: numeroPrestamoValue(g.noPrestamo),
    [HEADERS[1]]: g.codigoUnico,
    [HEADERS[2]]: g.nombreCliente,
    [HEADERS[3]]: g.cantCtas,
    [HEADERS[4]]: g.agencia,
    [HEADERS[5]]: g.gestor,
    [HEADERS[6]]: parseFechaLocal(g.fechaGestion),
    [HEADERS[7]]: g.telefonoContacto,
    [HEADERS[8]]: g.codigoAccion,
    [HEADERS[9]]: g.codigoResultado,
    [HEADERS[10]]: g.nota,
    [HEADERS[11]]: g.razonMora,
    [HEADERS[12]]: g.montoPromesa ?? '',
    [HEADERS[13]]: parseFechaLocal(g.fechaProximaGestion),
    [HEADERS[14]]: g.comentario,
    [HEADERS[15]]: g.tipificacion,
    [HEADERS[16]]: g.mes,
    [HEADERS[17]]: g.pagos,
  }));

  const sheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows, { header: [...HEADERS] })
      : XLSX.utils.aoa_to_sheet([[...HEADERS]]);

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Hoja1');

  const safeName = opts.mandanteNombre.replace(/[^\w\-]+/g, '_').slice(0, 40);
  XLSX.writeFile(
    book,
    `Informe_de_gestiones_${safeName}_${opts.periodo}.xlsx`,
  );
}
