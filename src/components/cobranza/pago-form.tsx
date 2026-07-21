'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface PagoFormData {
  monto: number;
  fechaPago: string;
  moneda: 'NIO' | 'USD';
  medio?: string;
  idempotencyKey: string;
}

interface PagoFormProps {
  monedaDefault?: 'NIO' | 'USD';
  onSubmit: (data: PagoFormData) => void;
  isLoading?: boolean;
}

function nuevaIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `pago_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function PagoForm({
  monedaDefault = 'NIO',
  onSubmit,
  isLoading,
}: PagoFormProps) {
  const [monto, setMonto] = useState('');
  const [fechaPago, setFechaPago] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [moneda, setMoneda] = useState<'NIO' | 'USD'>(monedaDefault);
  const [medio, setMedio] = useState('');
  const [idempotencyKey] = useState(nuevaIdempotencyKey);

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Monto *</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Fecha pago *</label>
          <input
            type="date"
            required
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Moneda</label>
          <select
            value={moneda}
            onChange={(e) => setMoneda(e.target.value as 'NIO' | 'USD')}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          >
            <option value="NIO">NIO (Córdobas)</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Medio</label>
          <select
            value={medio}
            onChange={(e) => setMedio(e.target.value)}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
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
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Registrando...' : 'Registrar pago'}
      </Button>
    </form>
  );
}
