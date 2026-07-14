import type {
  ReporteCarteraSinGestion,
  ReporteComisionesCobradores,
  ReporteCumplimientoAcuerdos,
  ReporteEfectividad,
  ReporteGanancias,
} from '@/types/cobranza';

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportReporteGananciasCsv(reporte: ReporteGanancias): void {
  const lines: string[] = [
    'Indicador,Valor',
    `Mandante,${reporte.mandanteNombre}`,
    `Periodo,${reporte.periodo}`,
    `Pagos,${reporte.cantidadPagos}`,
    `Recuperado,${reporte.totalRecuperado}`,
    `Ingreso empresa,${reporte.totalIngresoEmpresa}`,
    `Comisiones,${reporte.totalComision}`,
    `Ganancia neta,${reporte.gananciaNeta}`,
    `Margen %,${reporte.margenPct}`,
    '',
    'Gestor,Pagos,Recuperado,Ingreso,Comision,Ganancia neta,Margen %',
    ...reporte.porGestor.map(
      (g) =>
        `"${g.nombre}",${g.cantidadPagos},${g.totalRecuperado},${g.totalIngresoEmpresa},${g.totalComision},${g.gananciaNeta},${g.margenPct}`,
    ),
    '',
    'Tramo,Pagos,Recuperado,Ingreso,Comision,Ganancia neta',
    ...reporte.porTramoMora.map(
      (t) =>
        `"${t.tramo}",${t.cantidadPagos},${t.totalRecuperado},${t.totalIngresoEmpresa},${t.totalComision},${t.gananciaNeta}`,
    ),
  ];
  downloadCsv(
    `reporte-ganancias-${reporte.periodo}.csv`,
    lines.join('\n'),
  );
}

export function exportReporteComisionesCsv(
  reporte: ReporteComisionesCobradores,
): void {
  const lines: string[] = [
    'Indicador,Valor',
    `Mandante,${reporte.mandanteNombre}`,
    `Periodo,${reporte.periodo ?? 'Histórico'}`,
    `Liquidaciones,${reporte.cantidadLiquidaciones}`,
    `Comisión total,${reporte.totalComision}`,
    `Borrador,${reporte.totalComisionBorrador}`,
    `Emitida,${reporte.totalComisionEmitida}`,
    `Pagada,${reporte.totalComisionPagada}`,
    '',
    'Liquidacion,Periodo,Estado,Gestor,Pagos,Recuperado,Ingreso,Comision',
    ...reporte.porCobrador.map(
      (r) =>
        `${r.idliquidacion},${r.periodo},${r.estado},"${r.nombreGestor}",${r.cantidadPagos},${r.totalRecuperado},${r.totalIngresoEmpresa},${r.totalComision}`,
    ),
  ];
  downloadCsv(
    `reporte-comisiones-${reporte.periodo ?? 'historico'}.csv`,
    lines.join('\n'),
  );
}

export function exportReporteEfectividadCsv(
  reporte: ReporteEfectividad,
): void {
  const lines: string[] = [
    'Indicador,Valor',
    `Mandante,${reporte.mandanteNombre}`,
    `Periodo,${reporte.periodo}`,
    `Gestiones,${reporte.totalGestiones}`,
    `Efectivas,${reporte.totalGestionesEfectivas}`,
    `Efectividad %,${reporte.efectividadPct}`,
    `Contacto %,${reporte.tasaContactoPct}`,
    `Recuperado,${reporte.totalRecuperado}`,
    '',
    'Gestor,Gestiones,Efectivas,Efectividad %,Contacto %,Recuperado,Asignados,En mora,Saldo,Recuperacion %',
    ...reporte.porGestor.map(
      (g) =>
        `"${g.nombre}",${g.gestiones},${g.gestionesEfectivas},${g.efectividadPct},${g.tasaContactoPct},${g.montoRecuperado},${g.prestamosAsignados},${g.prestamosEnMora},${g.saldoAsignado},${g.recuperacionPct}`,
    ),
  ];
  downloadCsv(
    `reporte-efectividad-${reporte.periodo}.csv`,
    lines.join('\n'),
  );
}

export function exportReporteCumplimientoCsv(
  reporte: ReporteCumplimientoAcuerdos,
): void {
  const lines: string[] = [
    'Indicador,Valor',
    `Mandante,${reporte.mandanteNombre}`,
    `Periodo,${reporte.periodo}`,
    `Acuerdos,${reporte.totalAcuerdos}`,
    `Vigentes,${reporte.vigentes}`,
    `Cumplidos,${reporte.cumplidos}`,
    `Rotos,${reporte.rotos}`,
    `Cumplimiento %,${reporte.cumplimientoPct}`,
    `Monto acordado,${reporte.montoAcordadoTotal}`,
    `Monto cumplido,${reporte.montoCumplido}`,
    '',
    'Id,Prestamo,Cliente,Gestor,Estado,Monto,Cuotas,Pendientes,Pagadas,Vencidas,Inicio',
    ...reporte.acuerdos.map(
      (a) =>
        `${a.idacuerdo},${a.noPrestamo},"${a.nombreCliente}","${a.nombreGestor ?? ''}",${a.estado},${a.montoAcordado},${a.numeroCuotas},${a.cuotasPendientes},${a.cuotasPagadas},${a.cuotasVencidas},${a.fechaInicio}`,
    ),
  ];
  downloadCsv(
    `reporte-cumplimiento-acuerdos-${reporte.periodo}.csv`,
    lines.join('\n'),
  );
}

export function exportReporteCarteraSinGestionCsv(
  reporte: ReporteCarteraSinGestion,
): void {
  const lines: string[] = [
    'Indicador,Valor',
    `Mandante,${reporte.mandanteNombre}`,
    `Días sin gestión,${reporte.diasSinGestion}`,
    `Préstamos,${reporte.totalPrestamos}`,
    `Saldo,${reporte.saldoTotal}`,
    '',
    'Umbral días,Préstamos,Saldo',
    ...reporte.resumenTramos.map(
      (t) => `${t.diasUmbral},${t.cantidadPrestamos},${t.saldoTotal}`,
    ),
    '',
    'Prestamo,Cliente,Gestor,Días mora,Saldo,Días sin gestión,Última gestión',
    ...reporte.prestamos.map(
      (p) =>
        `${p.noPrestamo},"${p.nombreCliente}","${p.nombreGestor ?? ''}",${p.diasMora},${p.saldoTotal},${p.diasSinGestion ?? ''},${p.ultimaGestion ?? ''}`,
    ),
  ];
  downloadCsv(
    `reporte-cartera-sin-gestion-${reporte.diasSinGestion}d.csv`,
    lines.join('\n'),
  );
}
