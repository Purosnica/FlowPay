/**
 * Valida la fórmula CREDICOMPRAS contra el archivo Excel del mandante.
 * Uso: npx tsx scripts/validate-credicompras-excel.ts [ruta-archivo]
 */
import fs from 'fs';
import * as XLSX from 'xlsx';
import { calcularDesgloseSaldo } from '../src/lib/cobranza/prestamo-saldo-desglose';
import { parseCarteraFile } from '../src/lib/cobranza/import/parse-cartera-file';
import { extraerDatosFinancierosCartera } from '../src/lib/cobranza/import/cartera-financiero-helpers';

const ARCHIVO_DEFAULT =
  'C:\\Users\\Bryan Silva\\Downloads\\EQUIPO- CARTERA CREDITO PARA COMPRAS 16032026 (1BLOQ) REASIGNADA (2).xlsb';

const TOLERANCIA = 0.02;

function num(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val;
  }
  if (typeof val === 'string') {
    const n = Number(val.replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function validarHojaData(archivo: string): void {
  const buffer = fs.readFileSync(archivo);
  const parsed = parseCarteraFile(buffer, 'cartera.xlsb', {
    nombreHoja: 'data',
  });

  let cuadran = 0;
  let noCuadran = 0;
  const ejemplosNoCuadran: Array<{
    noPrestamo: string;
    saldoArchivo: number;
    saldoCalc: number;
    dif: number;
  }> = [];
  const ejemplosCuadran: Array<{
    noPrestamo: string;
    saldoArchivo: number;
    baseAcuerdo: number;
    moratorio: number;
  }> = [];

  for (const fila of parsed.filas) {
    const datos = extraerDatosFinancierosCartera(fila);
    const noPrestamo = String(fila.valores.noPrestamo ?? '');

    const desglose = calcularDesgloseSaldo({
      montoPrestamo: datos.montoPrestamo,
      interes: datos.interes,
      gestionCobranza: datos.gestionCobranza,
      comisionCav: datos.comisionCav,
      comisionInsitu: datos.comisionInsitu,
      mantenimientoValor: datos.mantenimientoValor,
      seguroSvsd: datos.seguroSvsd,
      cargosAdmin: datos.cargosAdmin,
      devolucionSaldoFavor: datos.devolucionSaldoFavor,
      descuentosArchivo: datos.descuentosArchivo,
      interesMoratorio: datos.interesMoratorio,
      totalPagosAplicados: datos.totalPagosArchivo,
      saldoRegistrado: datos.saldoTotal,
    });

    if (desglose.cuadra) {
      cuadran++;
      if (ejemplosCuadran.length < 3) {
        ejemplosCuadran.push({
          noPrestamo,
          saldoArchivo: desglose.saldoRegistrado,
          baseAcuerdo: desglose.baseAcuerdo,
          moratorio: desglose.interesMoratorio,
        });
      }
    } else {
      noCuadran++;
      if (ejemplosNoCuadran.length < 5) {
        ejemplosNoCuadran.push({
          noPrestamo,
          saldoArchivo: desglose.saldoRegistrado,
          saldoCalc: desglose.saldoCalculado,
          dif: desglose.diferencia,
        });
      }
    }
  }

  const total = parsed.filas.length;
  const pct = total > 0 ? ((cuadran / total) * 100).toFixed(1) : '0';

  process.stdout.write(`\n=== Hoja data — ${archivo} ===\n`);
  process.stdout.write(`Filas: ${total}\n`);
  process.stdout.write(`Cuadran: ${cuadran} (${pct}%)\n`);
  process.stdout.write(`No cuadran: ${noCuadran}\n`);
  process.stdout.write(
    `Columnas faltantes: ${parsed.columnasFaltantes.join(', ') || 'ninguna'}\n`,
  );

  if (ejemplosCuadran.length > 0) {
    process.stdout.write('\nEjemplos que cuadran:\n');
    for (const e of ejemplosCuadran) {
      process.stdout.write(
        `  ${e.noPrestamo}: SaldoTotal=${e.saldoArchivo.toFixed(2)}, ` +
          `Moratorio=${e.moratorio.toFixed(2)}, BaseAcuerdo=${e.baseAcuerdo.toFixed(2)}\n`,
      );
    }
  }

  if (ejemplosNoCuadran.length > 0) {
    process.stdout.write('\nEjemplos con diferencia:\n');
    for (const e of ejemplosNoCuadran) {
      process.stdout.write(
        `  ${e.noPrestamo}: archivo=${e.saldoArchivo.toFixed(2)}, ` +
          `calc=${e.saldoCalc.toFixed(2)}, dif=${e.dif.toFixed(2)}\n`,
      );
    }
  }
}

function validarInformePagos(archivo: string): void {
  const wb = XLSX.readFile(archivo, { cellDates: true });
  const sheetName = wb.SheetNames.find((n) =>
    n.replace(/\s+/g, ' ').trim().toLowerCase().includes('informe pagos'),
  );
  if (!sheetName) {
    process.stdout.write('\nHoja INFORME PAGOS no encontrada.\n');
    return;
  }

  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });

  if (rows.length === 0) {
    return;
  }

  const headers = Object.keys(rows[0] ?? {});
  const colsMes = headers.filter(
    (h) =>
      /marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i.test(
        h,
      ) && !/fecha|vencimiento/i.test(h),
  );

  process.stdout.write(`\n=== Hoja ${sheetName} ===\n`);
  process.stdout.write(`Filas: ${rows.length}\n`);
  process.stdout.write(`Columnas mensuales detectadas: ${colsMes.join(', ')}\n`);

  const muestra = rows.slice(0, 3);
  for (const row of muestra) {
    const prestamo =
      row['NoPrestamo'] ?? row['No Prestamo'] ?? row['NOPRESTAMO'] ?? '?';
    const montoOriginal = num(
      row['MONTO ORIGINAL'] ?? row['Monto Original'] ?? row['MONTO_ORIGINAL'],
    );
    const pagosMes: string[] = [];
    for (const col of colsMes) {
      const v = num(row[col]);
      if (v > 0) {
        pagosMes.push(`${col}=${v.toFixed(2)}`);
      }
    }
    const totalPagosMes = colsMes.reduce((s, c) => s + num(row[c]), 0);
    const saldoEstimado = montoOriginal - totalPagosMes;
    process.stdout.write(
      `\n  Préstamo ${prestamo}:\n` +
        `    MONTO ORIGINAL (corte): ${montoOriginal.toFixed(2)}\n` +
        `    Pagos por mes: ${pagosMes.length > 0 ? pagosMes.join(', ') : 'ninguno'}\n` +
        `    Total pagos meses: ${totalPagosMes.toFixed(2)}\n` +
        `    Saldo estimado (corte − pagos): ${saldoEstimado.toFixed(2)}\n`,
    );
  }
}

async function main(): Promise<void> {
  const archivo = process.argv[2] ?? ARCHIVO_DEFAULT;
  if (!fs.existsSync(archivo)) {
    throw new Error(`Archivo no encontrado: ${archivo}`);
  }

  process.stdout.write(`Validando: ${archivo}\n`);
  process.stdout.write(`Tolerancia: C$ ${TOLERANCIA}\n`);

  validarHojaData(archivo);
  validarInformePagos(archivo);
  process.stdout.write('\n');
}

main().catch((err: unknown) => {
  const mensaje = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${mensaje}\n`);
  process.exit(1);
});
