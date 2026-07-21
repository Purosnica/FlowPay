'use client';

import {
  formatearFechaComprobante,
  formatearFechaHoraComprobante,
} from '@/lib/logic/comprobante-pago-logic';
import { formatearMoneda, type ComprobantePago } from '@/types/cobranza';

interface ComprobantePagoDocumentProps {
  comprobante: ComprobantePago;
}

function Fila({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span
        className={`shrink-0 text-[10px] uppercase tracking-wider ${
          muted ? 'text-neutral-500' : 'text-neutral-700'
        }`}
      >
        {label}
      </span>
      <span className="text-right text-[11px] font-medium leading-snug break-all text-black">
        {value}
      </span>
    </div>
  );
}

function Guion() {
  return (
    <div
      className="my-2.5 border-t border-dashed border-neutral-400"
      aria-hidden
    />
  );
}

function DobleLinea() {
  return (
    <div className="my-2.5 space-y-0.5" aria-hidden>
      <div className="border-t-2 border-black" />
      <div className="border-t border-black" />
    </div>
  );
}

export function ComprobantePagoDocument({
  comprobante,
}: ComprobantePagoDocumentProps) {
  const c = comprobante;
  const moneda = c.moneda;

  return (
    <div
      id="comprobante-pago-print"
      className="comprobante-termico mx-auto bg-white text-black"
    >
      <section className="px-3 py-4 font-mono antialiased">
        {/* Marca FlowPay */}
        <header className="text-center">
          <img
            src="/images/logo/logo.svg"
            alt="FlowPay"
            className="mx-auto h-9 w-auto object-contain"
          />
          <p className="mt-1.5 text-[14px] font-black uppercase leading-none tracking-[0.12em]">
            FlowPay
          </p>
          <p className="mt-0.5 text-[9px] uppercase tracking-wider text-neutral-500">
            Recuperación de cartera
          </p>
          <div className="mt-2.5 inline-block border border-black px-2 py-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest">
              Comprobante de pago
            </p>
          </div>
          <p className="mt-1.5 text-[11px] font-bold tracking-wide">
            {c.folio}
          </p>
        </header>

        <Guion />

        {/* Datos operativos */}
        <div className="space-y-1.5">
          <Fila
            label="Fecha pago"
            value={formatearFechaComprobante(c.fechaPago)}
            muted
          />
          <Fila
            label="Registrado"
            value={formatearFechaHoraComprobante(c.fechaRegistro)}
            muted
          />
          <Fila label="Mandante" value={c.mandanteNombre} muted />
          <Fila label="Préstamo" value={c.noPrestamo} muted />
          <Fila label="Código" value={c.codigoUnico} muted />
        </div>

        <Guion />

        {/* Cliente */}
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-neutral-500">
            Cliente
          </p>
          <p className="text-[12px] font-bold leading-snug break-words">
            {c.nombreCliente}
          </p>
          <p className="mt-1 text-[10px] text-neutral-600">
            Doc. {c.numerodocumento}
          </p>
        </div>

        <DobleLinea />

        {/* Montos — bloque principal */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-neutral-600">
              Saldo anterior
            </span>
            <span className="text-[12px] tabular-nums">
              {formatearMoneda(c.saldoAnterior, moneda)}
            </span>
          </div>

          <div className="rounded border-2 border-black bg-neutral-50 px-2 py-2 print:bg-white">
            <p className="text-center text-[9px] font-bold uppercase tracking-[0.2em]">
              Abono recibido
            </p>
            <p className="mt-0.5 text-center text-[18px] font-black tabular-nums leading-none tracking-tight">
              {formatearMoneda(c.monto, moneda)}
            </p>
          </div>

          <div className="flex items-baseline justify-between gap-2 border-t border-black pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Saldo nuevo
            </span>
            <span className="text-[14px] font-black tabular-nums">
              {formatearMoneda(c.saldoNuevo, moneda)}
            </span>
          </div>
        </div>

        <DobleLinea />

        <div className="space-y-1.5">
          <Fila label="Cobrador" value={c.gestorNombre ?? '—'} muted />
        </div>

        <Guion />

        <p className="text-center text-[9px] leading-relaxed text-neutral-600">
          Conserve este comprobante
          <br />
          para su referencia.
        </p>
        <p className="mt-1 text-center text-[8px] uppercase tracking-widest text-neutral-400">
          Emitido por FlowPay
        </p>

        <div className="mt-5 px-4">
          <div className="border-t border-black pt-1 text-center text-[9px] uppercase tracking-wider text-neutral-500">
            Firma / Acuse
          </div>
        </div>

        <p className="mt-3 text-center text-[10px] tracking-[0.3em]">•••</p>
      </section>
    </div>
  );
}
