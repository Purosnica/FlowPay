'use client';

import {
  formatearMoneda,
  type FilaDesglosePreview,
  type ResumenDesglosePreview,
} from '@/types/cobranza';

interface ImportDesglosePreviewTableProps {
  filas: FilaDesglosePreview[];
  resumen: ResumenDesglosePreview;
  moneda?: string;
}

function fmtMonto(valor: number, moneda: string): string {
  return formatearMoneda(valor, moneda);
}

export function ImportDesglosePreviewTable({
  filas,
  resumen,
  moneda = 'NIO',
}: ImportDesglosePreviewTableProps) {
  const hayDiferencias = resumen.filasConDiferencia > 0;

  return (
    <div className="mt-4 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-dark dark:text-white">
          Verificación de saldos CREDICOMPRAS
        </h4>
        <p className="mt-1 text-xs text-gray-6">
          Componentes − devolución − descuentos − pagos = saldo calculado.
          Compare con SaldoTotal del archivo. El moratorio se muestra aparte
          (base acuerdo).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div>
          <p className="text-gray-6">Filas analizadas</p>
          <p className="font-semibold">{resumen.filasAnalizadas}</p>
        </div>
        <div>
          <p className="text-gray-6">Cuadran</p>
          <p className="font-semibold text-green-600">
            {resumen.filasCuadran}
          </p>
        </div>
        <div>
          <p className="text-gray-6">Con diferencia</p>
          <p
            className={`font-semibold ${
              hayDiferencias ? 'text-amber-600' : 'text-gray-6'
            }`}
          >
            {resumen.filasConDiferencia}
          </p>
        </div>
        <div>
          <p className="text-gray-6">Total archivo</p>
          <p className="font-semibold">
            {fmtMonto(resumen.totalSaldoArchivo, moneda)}
          </p>
        </div>
      </div>

      {hayDiferencias && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          {resumen.filasConDiferencia} préstamo(s) con diferencia entre el
          saldo del archivo y el calculado. Revise la muestra antes de importar.
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-stroke dark:border-dark-3">
        <table className="w-full min-w-[800px] text-left text-xs">
          <thead className="bg-gray-50 dark:bg-dark-2">
            <tr>
              <th className="px-3 py-2 font-medium">Fila</th>
              <th className="px-3 py-2 font-medium">Préstamo</th>
              <th className="px-3 py-2 text-right font-medium">Componentes</th>
              <th className="px-3 py-2 text-right font-medium">Moratorio</th>
              <th className="px-3 py-2 text-right font-medium">Base acuerdo</th>
              <th className="px-3 py-2 text-right font-medium">Pagos</th>
              <th className="px-3 py-2 text-right font-medium">Calculado</th>
              <th className="px-3 py-2 text-right font-medium">Archivo</th>
              <th className="px-3 py-2 text-right font-medium">Dif.</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr
                key={`${fila.fila}-${fila.noPrestamo}`}
                className="border-t border-stroke dark:border-dark-3"
              >
                <td className="px-3 py-2">{fila.fila}</td>
                <td className="px-3 py-2 font-medium">{fila.noPrestamo}</td>
                <td className="px-3 py-2 text-right">
                  {fmtMonto(fila.subtotalComponentes, moneda)}
                </td>
                <td className="px-3 py-2 text-right">
                  {fmtMonto(fila.interesMoratorio, moneda)}
                </td>
                <td className="px-3 py-2 text-right">
                  {fmtMonto(fila.baseAcuerdo, moneda)}
                </td>
                <td className="px-3 py-2 text-right">
                  {fmtMonto(fila.totalPagosAplicados, moneda)}
                </td>
                <td className="px-3 py-2 text-right">
                  {fmtMonto(fila.saldoCalculado, moneda)}
                </td>
                <td className="px-3 py-2 text-right">
                  {fmtMonto(fila.saldoArchivo, moneda)}
                </td>
                <td
                  className={`px-3 py-2 text-right ${
                    !fila.cuadra ? 'font-medium text-amber-600' : ''
                  }`}
                >
                  {fmtMonto(fila.diferencia, moneda)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      fila.cuadra
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30'
                    }`}
                  >
                    {fila.cuadra ? 'OK' : 'Revisar'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filas.length < resumen.filasAnalizadas && (
        <p className="text-xs text-gray-500">
          Mostrando {filas.length} de {resumen.filasAnalizadas} filas
          {hayDiferencias ? ' (priorizando las que tienen diferencia)' : ''}.
        </p>
      )}
    </div>
  );
}
