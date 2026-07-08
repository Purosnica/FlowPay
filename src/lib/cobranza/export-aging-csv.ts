import type { ReporteAgingCartera } from './aging-cartera-service';

export function exportAgingCsv(reporte: ReporteAgingCartera): string {
  const lines = [
    'Tramo,Prestamos,Saldo,Porcentaje',
    ...reporte.tramos.map(
      (t) =>
        `"${t.tramo}",${t.cantidadPrestamos},${t.saldoTotal.toFixed(2)},${t.porcentajeSaldo.toFixed(2)}%`,
    ),
  ];
  return lines.join('\n');
}
