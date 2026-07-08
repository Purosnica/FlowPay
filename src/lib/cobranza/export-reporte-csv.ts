import type { ReporteCobranzaCompleto } from './reporte-cobranza-service';

export function exportReporteCsv(reporte: ReporteCobranzaCompleto): string {
  const lines: string[] = [
    'Indicador,Valor',
    `Préstamos,${reporte.totalPrestamos}`,
    `En mora,${reporte.prestamosEnMora}`,
    `Saldo cartera,${reporte.saldoCartera}`,
    `Recuperado,${reporte.totalRecuperado}`,
    `Gestiones,${reporte.totalGestiones}`,
    `Acuerdos vigentes,${reporte.totalAcuerdosVigentes}`,
    `Tasa recuperación %,${reporte.tasaRecuperacion}`,
    '',
    'Gestor,Gestiones,Recuperado',
  ];

  for (const g of reporte.porGestor) {
    lines.push(`${g.nombre},${g.gestiones},${g.montoRecuperado}`);
  }

  return lines.join('\n');
}
