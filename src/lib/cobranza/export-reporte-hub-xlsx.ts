import type {
  ReporteAgingCartera,
  ReporteCobranza,
} from '@/types/cobranza';
import {
  downloadWorkbook,
  XLSX_FMT,
} from '@/lib/cobranza/export-xlsx-utils';

export function exportReporteCobranzaXlsx(reporte: ReporteCobranza): void {
  downloadWorkbook(
    [
      {
        name: 'KPIs',
        title: 'Indicadores de cobranza',
        meta: [
          { label: 'Periodo', value: reporte.periodo ?? 'Histórico' },
          { label: 'Préstamos', value: reporte.totalPrestamos },
          { label: 'En mora', value: reporte.prestamosEnMora },
          { label: 'Saldo cartera', value: reporte.saldoCartera },
          { label: 'Recuperado', value: reporte.totalRecuperado },
          { label: 'Gestiones', value: reporte.totalGestiones },
          { label: 'Acuerdos vigentes', value: reporte.totalAcuerdosVigentes },
          { label: 'Tasa recuperación %', value: reporte.tasaRecuperacion },
        ]
      },
      {
        name: 'Por gestor',
        title: 'Desempeño por gestor',
        columns: [
          { header: 'Gestor', width: 28 },
          { header: 'Gestiones', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Recuperado', width: 14, numFmt: XLSX_FMT.money },
        ],
        rows: reporte.porGestor.map((g) => [
          g.nombre,
          g.gestiones,
          g.montoRecuperado,
        ]),
      },
    ],
    `reporte-cobranza-${reporte.periodo ?? 'historico'}`,
  );
}

export function exportAgingCarteraXlsx(reporte: ReporteAgingCartera): void {
  downloadWorkbook(
    [
      {
        name: 'Aging',
        title: 'Aging de cartera',
        meta: [
          { label: 'Mandante ID', value: reporte.idmandante },
          { label: 'Saldo total', value: reporte.saldoCarteraTotal },
          { label: 'Préstamos', value: reporte.totalPrestamos },
        ],
        columns: [
          { header: 'Tramo', width: 18 },
          { header: 'Préstamos', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Saldo', width: 14, numFmt: XLSX_FMT.money },
          { header: '% Cartera', width: 12, numFmt: XLSX_FMT.percent },
        ],
        rows: reporte.tramos.map((t) => [
          t.tramo,
          t.cantidadPrestamos,
          t.saldoTotal,
          t.porcentajeSaldo,
        ]),
      },
    ],
    `aging-cartera-${reporte.idmandante}`,
  );
}
