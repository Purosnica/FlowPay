'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { crearIdempotencyKey } from '@/lib/api/idempotency-key';
import {
  construirMontosRapidos,
  type MontoRapidoChip,
} from '@/lib/logic/pago-montos-rapidos-logic';

export interface PagoFormData {
  monto: number;
  fechaPago: string;
  moneda: 'NIO' | 'USD';
  medio?: string;
  idempotencyKey: string;
}

export interface PagoFormInitialValues {
  monto: number;
  fechaPago: string;
  moneda: 'NIO' | 'USD';
  medio?: string | null;
}

interface PagoFormProps {
  monedaDefault?: 'NIO' | 'USD';
  /** Medio por defecto (ej. EFECTIVO en campo). */
  medioDefault?: string;
  /** Valores iniciales (modo edición). */
  initialValues?: PagoFormInitialValues;
  /** Etiqueta del botón de envío. */
  submitLabel?: string;
  /** Oculta chips de monto rápido (útil en edición). */
  ocultarMontosRapidos?: boolean;
  saldoTotal?: number | null;
  montoCuota?: number | null;
  montoPromesa?: number | null;
  onSubmit: (data: PagoFormData) => void;
  isLoading?: boolean;
}

function fechaInputValue(fecha: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(fecha);
  if (match) {
    return match[1];
  }
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function PagoForm({
  monedaDefault = 'NIO',
  medioDefault = '',
  initialValues,
  submitLabel = 'Registrar pago',
  ocultarMontosRapidos = false,
  saldoTotal,
  montoCuota,
  montoPromesa,
  onSubmit,
  isLoading,
}: PagoFormProps) {
  const montoId = useId();
  const fechaId = useId();
  const monedaId = useId();
  const medioId = useId();
  const [monto, setMonto] = useState(
    initialValues ? String(initialValues.monto) : '',
  );
  const [fechaPago, setFechaPago] = useState(
    initialValues
      ? fechaInputValue(initialValues.fechaPago)
      : new Date().toISOString().slice(0, 10),
  );
  const [moneda, setMoneda] = useState<'NIO' | 'USD'>(
    initialValues?.moneda ?? monedaDefault,
  );
  const [medio, setMedio] = useState(
    initialValues?.medio ?? medioDefault,
  );
  const [idempotencyKey] = useState(() => crearIdempotencyKey('pago'));

  const chips: MontoRapidoChip[] = ocultarMontosRapidos
    ? []
    : construirMontosRapidos({
        saldoTotal,
        montoCuota,
        montoPromesa,
      });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = Number(monto);
    if (!m || m <= 0) {
      return;
    }
    onSubmit({
      monto: m,
      fechaPago: new Date(fechaPago).toISOString(),
      moneda,
      medio: medio || undefined,
      idempotencyKey,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {chips.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Monto rápido</p>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Button
                key={`${chip.label}-${chip.valor}`}
                type="button"
                size="sm"
                variant="outline"
                data-ux-id={`pago-monto-${chip.label.toLowerCase()}`}
                onClick={() => setMonto(String(chip.valor))}
              >
                {chip.label}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor={montoId} className="mb-1 block text-sm font-medium">
            Monto <span aria-hidden="true">*</span>
          </label>
          <input
            id={montoId}
            type="number"
            required
            aria-required
            min="0.01"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="field-touch-target w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor={fechaId} className="mb-1 block text-sm font-medium">
            Fecha pago <span aria-hidden="true">*</span>
          </label>
          <input
            id={fechaId}
            type="date"
            required
            aria-required
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            className="field-touch-target w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor={monedaId} className="mb-1 block text-sm font-medium">
            Moneda
          </label>
          <select
            id={monedaId}
            value={moneda}
            onChange={(e) => setMoneda(e.target.value as 'NIO' | 'USD')}
            className="field-touch-target w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          >
            <option value="NIO">NIO (Córdobas)</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label htmlFor={medioId} className="mb-1 block text-sm font-medium">
            Medio
          </label>
          <select
            id={medioId}
            value={medio}
            onChange={(e) => setMedio(e.target.value)}
            className="field-touch-target w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          >
            <option value="">Seleccione...</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="DEPOSITO">Depósito</option>
            <option value="CHEQUE">Cheque</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
      </div>
      <div className="field-sticky-actions">
        <Button type="submit" disabled={isLoading} className="field-touch-target">
          {isLoading ? 'Guardando...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
