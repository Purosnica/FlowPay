'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import { InformeGerencialDocument } from '@/components/cobranza/informe-gerencial-document';
import { PageHeader } from '@/components/ui/page-header';
import { ReporteAsyncContent } from '@/components/cobranza/reporte-async-content';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_INFORME_GERENCIAL } from '@/lib/graphql/queries/cobranza.queries';
import { exportInformePagosXlsx } from '@/lib/cobranza/export-informe-pagos-xlsx';
import { exportInformeGerencialDocx } from '@/lib/cobranza/export-informe-gerencial-docx';
import { periodoActual } from '@/lib/cobranza/periodo-utils';
import {
  formatearMoneda,
  type InformeGerencial,
} from '@/types/cobranza';

export default function InformeGerencialPage() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [destinatarioNombre, setDestinatarioNombre] = useState('');
  const [destinatarioCargo, setDestinatarioCargo] = useState('Ingeniero');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportOk, setExportOk] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const mandanteId = idmandante === '' ? 0 : idmandante;

  const { data, isLoading, error, refetch, isFetching } = useGraphQLQuery<{
    informeGerencial: InformeGerencial;
  }>(
    GET_INFORME_GERENCIAL,
    { idmandante: mandanteId, periodo },
    { enabled: mandanteId > 0 && /^\d{4}-\d{2}$/.test(periodo) },
  );

  const informe = data?.informeGerencial;
  const ind = informe?.indicadores;

  function clearFeedback(): void {
    setExportError(null);
    setExportOk(null);
  }

  async function handleExportWord(): Promise<void> {
    if (!informe) {
      return;
    }
    clearFeedback();
    setIsExporting(true);
    try {
      await exportInformeGerencialDocx(informe, {
        destinatarioNombre,
        destinatarioCargo,
      });
      setExportOk('Informe Word descargado correctamente.');
    } catch {
      setExportError('No se pudo generar el archivo Word. Intente de nuevo.');
    } finally {
      setIsExporting(false);
    }
  }

  function handleExportExcel(): void {
    if (!informe || informe.pagos.length === 0) {
      return;
    }
    clearFeedback();
    try {
      exportInformePagosXlsx(informe.pagos, {
        mandanteNombre: informe.mandanteNombre,
        periodo: informe.periodo,
      });
      setExportOk('Detalle de pagos exportado a Excel.');
    } catch {
      setExportError('No se pudo generar el Excel de pagos.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <PageHeader
          title="Informe gerencial"
          description="Informe de cierre de mes para el mandante. Previsualice, imprima o exporte a Word / Excel."
        />

        <div className="mt-4 space-y-3 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
          <div className="flex flex-wrap items-end gap-3">
            <MandanteSelect
              value={idmandante}
              onChange={(v) => {
                clearFeedback();
                setIdmandante(v);
              }}
              required
            />
            <div>
              <label
                htmlFor="periodo-informe"
                className="mb-1 block text-sm font-medium"
              >
                Periodo
              </label>
              <input
                id="periodo-informe"
                type="month"
                value={periodo}
                onChange={(e) => {
                  clearFeedback();
                  setPeriodo(e.target.value);
                }}
                className="rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3"
              />
            </div>
            <div>
              <label
                htmlFor="dest-nombre"
                className="mb-1 block text-sm font-medium"
              >
                Destinatario
              </label>
              <input
                id="dest-nombre"
                type="text"
                value={destinatarioNombre}
                onChange={(e) => setDestinatarioNombre(e.target.value)}
                placeholder="Nombre del gerente"
                className="min-w-[220px] rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3"
              />
            </div>
            <div>
              <label
                htmlFor="dest-cargo"
                className="mb-1 block text-sm font-medium"
              >
                Tratamiento
              </label>
              <input
                id="dest-cargo"
                type="text"
                value={destinatarioCargo}
                onChange={(e) => setDestinatarioCargo(e.target.value)}
                placeholder="Ingeniero"
                className="min-w-[140px] rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-stroke pt-3 dark:border-dark-3">
            <Button
              type="button"
              variant="outline"
              disabled={!informe || isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? 'Actualizando…' : 'Actualizar'}
            </Button>
            <Button
              type="button"
              disabled={!informe || isExporting}
              onClick={() => void handleExportWord()}
            >
              {isExporting ? 'Generando Word…' : 'Exportar Word'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!informe || informe.pagos.length === 0}
              onClick={handleExportExcel}
            >
              Exportar Excel (pagos)
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!informe}
              onClick={() => window.print()}
            >
              Imprimir / PDF
            </Button>
          </div>

          {exportOk ? (
            <p
              className="text-sm text-green-700 dark:text-green-400"
              role="status"
            >
              {exportOk}
            </p>
          ) : null}
          {exportError ? (
            <p className="text-sm text-red-600" role="alert">
              {exportError}
            </p>
          ) : null}
        </div>

        {informe && ind ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-stroke bg-white p-3 dark:border-dark-3 dark:bg-gray-dark">
              <p className="text-xs text-dark-5 dark:text-dark-6">Recuperado</p>
              <p className="text-lg font-semibold text-green-700">
                {formatearMoneda(ind.montoRecuperado)}
              </p>
            </div>
            <div className="rounded-lg border border-stroke bg-white p-3 dark:border-dark-3 dark:bg-gray-dark">
              <p className="text-xs text-dark-5 dark:text-dark-6">
                Acuerdos formalizados
              </p>
              <p className="text-lg font-semibold">{ind.acuerdosFormalizados}</p>
            </div>
            <div className="rounded-lg border border-stroke bg-white p-3 dark:border-dark-3 dark:bg-gray-dark">
              <p className="text-xs text-dark-5 dark:text-dark-6">Cumplidos</p>
              <p className="text-lg font-semibold text-green-700">
                {ind.acuerdosCumplidos}
              </p>
            </div>
            <div className="rounded-lg border border-stroke bg-white p-3 dark:border-dark-3 dark:bg-gray-dark">
              <p className="text-xs text-dark-5 dark:text-dark-6">
                Incumplidos (rotos)
              </p>
              <p className="text-lg font-semibold text-amber-700">
                {ind.acuerdosIncumplidos}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {mandanteId === 0 ? (
        <p className="print:hidden text-sm text-dark-5 dark:text-dark-6">
          Seleccione un mandante y el periodo de cierre para generar el
          informe.
        </p>
      ) : (
        <ReporteAsyncContent
          isLoading={isLoading}
          error={error}
          hasData={Boolean(informe)}
          emptyMessage="Sin datos de informe para los filtros seleccionados."
        >
          {informe ? (
            <div className="overflow-hidden rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 print:border-0 print:shadow-none">
              <InformeGerencialDocument
                informe={informe}
                destinatarioNombre={destinatarioNombre}
                destinatarioCargo={destinatarioCargo}
              />
            </div>
          ) : null}
        </ReporteAsyncContent>
      )}

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          html,
          body {
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          #informe-gerencial-print,
          #informe-gerencial-print * {
            visibility: visible !important;
          }
          #informe-gerencial-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .informe-doc,
          .informe-doc * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .informe-page {
            page-break-after: always;
            break-after: page;
          }
          .informe-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .informe-table {
            break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          tr {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
