'use client';

import { use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ComprobantePagoDocument } from '@/components/cobranza/comprobante-pago-document';
import { PermissionGate } from '@/components/auth/permission-gate';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_COMPROBANTE_PAGO } from '@/lib/graphql/queries/cobranza.queries';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import type { ComprobantePago } from '@/types/cobranza';

export default function ComprobantePagoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const idpago = Number(id);

  const { data, isLoading, error } = useGraphQLQuery<{
    comprobantePago: ComprobantePago;
  }>(
    GET_COMPROBANTE_PAGO,
    { idpago },
    { enabled: Number.isInteger(idpago) && idpago > 0 },
  );

  const comprobante = data?.comprobantePago;

  return (
    <PermissionGate
      permiso={PERMISO.PAGO_READ}
      fallback={
        <p className="text-sm text-gray-500">
          No tiene permiso para ver comprobantes de pago.
        </p>
      }
    >
      <div className="space-y-6">
        <div className="print:hidden">
          <PageHeader
            title="Comprobante de pago"
            description={
              comprobante
                ? `Folio ${comprobante.folio} · Préstamo ${comprobante.noPrestamo} · Formato térmica 80 mm`
                : 'Vista para impresora térmica'
            }
            actions={
              <div className="flex flex-wrap gap-2">
                {comprobante ? (
                  <>
                    <Link
                      href={`/cobranza/prestamos/${comprobante.idprestamo}`}
                    >
                      <Button type="button" variant="outline">
                        Ver préstamo
                      </Button>
                    </Link>
                    <Button type="button" onClick={() => window.print()}>
                      Imprimir
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.history.back()}
                  >
                    Volver
                  </Button>
                )}
              </div>
            }
          />
        </div>

        {isLoading ? (
          <p className="print:hidden text-sm text-gray-500">
            Cargando comprobante…
          </p>
        ) : null}

        {error ? (
          <div
            className="print:hidden rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20"
            role="alert"
          >
            {error.message}
          </div>
        ) : null}

        {!isLoading && !error && !comprobante ? (
          <p className="print:hidden text-sm text-gray-500">
            No se encontró el pago solicitado.
          </p>
        ) : null}

        {comprobante ? (
          <div className="mx-auto w-[80mm] overflow-hidden rounded-lg border border-stroke bg-white shadow-md dark:border-dark-3 print:w-[80mm] print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
            <ComprobantePagoDocument comprobante={comprobante} />
          </div>
        ) : null}

        <style>{`
        .comprobante-termico {
          width: 80mm;
          max-width: 80mm;
        }
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #comprobante-pago-print,
          #comprobante-pago-print * {
            visibility: visible !important;
          }
          #comprobante-pago-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            color: #000 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
      </div>
    </PermissionGate>
  );
}
