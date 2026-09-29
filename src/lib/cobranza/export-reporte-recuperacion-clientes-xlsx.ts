import type { ReporteRecuperacionClientes } from '@/types/cobranza';
import { downloadWorkbook, XLSX_FMT } from './export-xlsx-utils';

export function exportReporteRecuperacionClientesXlsx(reporte: ReporteRecuperacionClientes): void {
  downloadWorkbook(
    [
      {
        name: 'Recuperación',
        title: 'Recuperación por clientes',
        meta: [
          { label: 'Período', value: reporte.periodo },
          { label: 'Depósitos', value: reporte.totalDepositos },
          { label: 'Monto abonado', value: reporte.totalAbonado },
          { label: 'Saldo pendiente', value: reporte.saldoPendienteTotal },
          { label: 'Recuperación %', value: reporte.recuperacionPct },
        ],
        columns: [
          { header: 'Nombre cliente', width: 30 },
          { header: 'Código único', width: 18 },
          { header: 'Monto saldo inicial', width: 18, numFmt: XLSX_FMT.money },
          { header: 'Ejecutivo', width: 24 },
          { header: 'Fecha de depósitos', width: 16 },
          { header: 'Tramo de mora', width: 16 },
          { header: 'Sucursal', width: 20 },
          { header: 'Banco', width: 24 },
          { header: 'Intereses moratorios', width: 20, numFmt: XLSX_FMT.money },
          { header: 'Descuentos', width: 16, numFmt: XLSX_FMT.money },
          { header: 'Saldo a la fecha', width: 18, numFmt: XLSX_FMT.money },
          { header: 'Monto abonado', width: 18, numFmt: XLSX_FMT.money },
          { header: 'Saldo pendiente', width: 18, numFmt: XLSX_FMT.money },
          { header: 'Porcentaje recuperado', width: 20, numFmt: XLSX_FMT.percent },
        ],
        rows: reporte.registros.map((r) => [
          r.nombreCliente,
          r.codigoUnico,
          r.saldoInicial,
          r.ejecutivo,
          r.fechaDeposito,
          r.tramoMora,
          r.sucursal,
          r.banco,
          r.interesesMoratorios,
          r.descuentos,
          r.saldoALaFecha,
          r.montoAbonado,
          r.saldoPendiente,
          r.porcentajeRecuperado / 100,
        ]),
      },
    ],
    `reporte-recuperacion-clientes-${reporte.periodo.replace('/', '-')}`
  );
}
