import type {
  ReporteCarteraSinGestion,
  ReporteComisionesCobradores,
  ReporteCumplimientoAcuerdos,
  ReporteEfectividad,
  ReporteGanancias,
} from '@/types/cobranza';
import {
  downloadWorkbook,
  XLSX_FMT,
  type ExcelMetaRow,
} from '@/lib/cobranza/export-xlsx-utils';

function metaMandante(
  mandanteNombre: string,
  extra: ExcelMetaRow[] = [],
): ExcelMetaRow[] {
  return [{ label: 'Mandante', value: mandanteNombre }, ...extra];
}

export function exportReporteGananciasXlsx(reporte: ReporteGanancias): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Reporte de ganancias',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Periodo', value: reporte.periodo },
          { label: 'Pagos', value: reporte.cantidadPagos },
          { label: 'Recuperado', value: reporte.totalRecuperado },
          { label: 'Ingreso empresa', value: reporte.totalIngresoEmpresa },
          { label: 'Comisiones', value: reporte.totalComision },
          { label: 'Ganancia neta', value: reporte.gananciaNeta },
          { label: 'Margen %', value: reporte.margenPct },
        ])
      },
      {
        name: 'Por gestor',
        title: 'Ganancias por gestor',
        columns: [
          { header: 'Gestor', width: 28 },
          { header: 'Pagos', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Recuperado', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Ingreso', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Comisión', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Ganancia neta', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Margen %', width: 12, numFmt: XLSX_FMT.percent },
        ],
        rows: reporte.porGestor.map((g) => [
          g.nombre,
          g.cantidadPagos,
          g.totalRecuperado,
          g.totalIngresoEmpresa,
          g.totalComision,
          g.gananciaNeta,
          g.margenPct,
        ]),
      },
      {
        name: 'Por tramo mora',
        title: 'Ganancias por tramo de mora',
        columns: [
          { header: 'Tramo', width: 18 },
          { header: 'Pagos', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Recuperado', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Ingreso', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Comisión', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Ganancia neta', width: 14, numFmt: XLSX_FMT.money },
        ],
        rows: reporte.porTramoMora.map((t) => [
          t.tramo,
          t.cantidadPagos,
          t.totalRecuperado,
          t.totalIngresoEmpresa,
          t.totalComision,
          t.gananciaNeta,
        ]),
      },
      {
        name: 'Por gestor y tramo',
        title: 'Tramo recuperado por gestor',
        columns: [
          { header: 'Gestor', width: 28 },
          { header: 'Tramo', width: 18 },
          { header: 'Pagos', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Recuperado', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Ingreso', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Comisión', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Ganancia neta', width: 14, numFmt: XLSX_FMT.money },
        ],
        rows: reporte.porGestorTramo.map((r) => [
          r.nombre,
          r.tramo,
          r.cantidadPagos,
          r.totalRecuperado,
          r.totalIngresoEmpresa,
          r.totalComision,
          r.gananciaNeta,
        ]),
      },
    ],
    `reporte-ganancias-${reporte.periodo}`,
  );
}

export function exportReporteComisionesXlsx(
  reporte: ReporteComisionesCobradores,
): void {
  const periodoLabel = reporte.periodo ?? 'historico';
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Reporte de comisiones a cobradores',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Periodo', value: reporte.periodo ?? 'Histórico' },
          { label: 'Liquidaciones', value: reporte.cantidadLiquidaciones },
          { label: 'Comisión total', value: reporte.totalComision },
          { label: 'Borrador', value: reporte.totalComisionBorrador },
          { label: 'Emitida', value: reporte.totalComisionEmitida },
          { label: 'Pagada', value: reporte.totalComisionPagada },
        ])
      },
      {
        name: 'Por cobrador',
        title: 'Detalle de liquidaciones por cobrador',
        columns: [
          { header: 'Liquidación', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Periodo', width: 12 },
          { header: 'Estado', width: 12 },
          { header: 'Gestor', width: 28 },
          { header: 'Pagos', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Recuperado', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Ingreso', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Comisión', width: 14, numFmt: XLSX_FMT.money },
        ],
        rows: reporte.porCobrador.map((r) => [
          r.idliquidacion,
          r.periodo,
          r.estado,
          r.nombreGestor,
          r.cantidadPagos,
          r.totalRecuperado,
          r.totalIngresoEmpresa,
          r.totalComision,
        ]),
      },
    ],
    `reporte-comisiones-${periodoLabel}`,
  );
}

export function exportReporteEfectividadXlsx(
  reporte: ReporteEfectividad,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Reporte de efectividad',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Periodo', value: reporte.periodo },
          { label: 'Gestiones', value: reporte.totalGestiones },
          { label: 'Efectivas', value: reporte.totalGestionesEfectivas },
          { label: 'Efectividad %', value: reporte.efectividadPct },
          { label: 'Contacto %', value: reporte.tasaContactoPct },
          { label: 'Recuperado', value: reporte.totalRecuperado },
        ])
      },
      {
        name: 'Por gestor',
        title: 'Efectividad por gestor',
        columns: [
          { header: 'Gestor', width: 28 },
          { header: 'Gestiones', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Efectivas', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Efectividad %', width: 14, numFmt: XLSX_FMT.percent },
          { header: 'Contacto %', width: 12, numFmt: XLSX_FMT.percent },
          { header: 'Recuperado', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Asignados', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'En mora', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Saldo', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Recuperación %', width: 14, numFmt: XLSX_FMT.percent },
        ],
        rows: reporte.porGestor.map((g) => [
          g.nombre,
          g.gestiones,
          g.gestionesEfectivas,
          g.efectividadPct,
          g.tasaContactoPct,
          g.montoRecuperado,
          g.prestamosAsignados,
          g.prestamosEnMora,
          g.saldoAsignado,
          g.recuperacionPct,
        ]),
      },
    ],
    `reporte-efectividad-${reporte.periodo}`,
  );
}

export function exportReporteCumplimientoXlsx(
  reporte: ReporteCumplimientoAcuerdos,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Cumplimiento de acuerdos',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Periodo', value: reporte.periodo },
          { label: 'Acuerdos', value: reporte.totalAcuerdos },
          { label: 'Vigentes', value: reporte.vigentes },
          { label: 'Cumplidos', value: reporte.cumplidos },
          { label: 'Rotos', value: reporte.rotos },
          { label: 'Cumplimiento %', value: reporte.cumplimientoPct },
          { label: 'Monto acordado', value: reporte.montoAcordadoTotal },
          { label: 'Monto cumplido', value: reporte.montoCumplido },
        ])
      },
      {
        name: 'Acuerdos',
        title: 'Detalle de acuerdos',
        columns: [
          { header: 'Id', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Préstamo', width: 14 },
          { header: 'Cliente', width: 28 },
          { header: 'Gestor', width: 24 },
          { header: 'Estado', width: 12 },
          { header: 'Monto', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Cuotas', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Pendientes', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Pagadas', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Vencidas', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Inicio', width: 12 },
        ],
        rows: reporte.acuerdos.map((a) => [
          a.idacuerdo,
          a.noPrestamo,
          a.nombreCliente,
          a.nombreGestor ?? '',
          a.estado,
          a.montoAcordado,
          a.numeroCuotas,
          a.cuotasPendientes,
          a.cuotasPagadas,
          a.cuotasVencidas,
          a.fechaInicio,
        ]),
      },
    ],
    `reporte-cumplimiento-acuerdos-${reporte.periodo}`,
  );
}

export function exportReporteCarteraSinGestionXlsx(
  reporte: ReporteCarteraSinGestion,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Cartera sin gestión',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Días sin gestión', value: reporte.diasSinGestion },
          { label: 'Préstamos', value: reporte.totalPrestamos },
          { label: 'Saldo', value: reporte.saldoTotal },
        ])
      },
      {
        name: 'Umbrales',
        title: 'Resumen por umbral de días',
        columns: [
          { header: 'Umbral días', width: 14, numFmt: XLSX_FMT.integer },
          { header: 'Préstamos', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Saldo', width: 14, numFmt: XLSX_FMT.money },
        ],
        rows: reporte.resumenTramos.map((t) => [
          t.diasUmbral,
          t.cantidadPrestamos,
          t.saldoTotal,
        ]),
      },
      {
        name: 'Préstamos',
        title: 'Detalle de cartera sin gestión',
        columns: [
          { header: 'Préstamo', width: 14 },
          { header: 'Cliente', width: 28 },
          { header: 'Gestor', width: 24 },
          { header: 'Días mora', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Saldo', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Días sin gestión', width: 16, numFmt: XLSX_FMT.integer },
          { header: 'Última gestión', width: 14 },
        ],
        rows: reporte.prestamos.map((p) => [
          p.noPrestamo,
          p.nombreCliente,
          p.nombreGestor ?? '',
          p.diasMora,
          p.saldoTotal,
          p.diasSinGestion ?? '',
          p.ultimaGestion ?? '',
        ]),
      },
    ],
    `reporte-cartera-sin-gestion-${reporte.diasSinGestion}d`,
  );
}
